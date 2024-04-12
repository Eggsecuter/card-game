import { Deck } from "./deck";
import { Player } from "./player";
import { Competitor } from "./competitor";
import { defaultPerfectSum, initialCardCount } from "../../shared/game-settings";
import { Game } from "./game";
import { ServerMessage } from "../../shared/messages";

export class Round {
	private deck = new Deck();
	private perfectSum = defaultPerfectSum;

	private turns = 0;
	private continuosStayCounter = 0;

	private get currentCompetitor() {
		// the starting competitor switches every round
		return this.turns % 2 == this.index % 2 ? this.competitorOne : this.competitorTwo;
	}

	private get bet() {
		return this.index + 1;
	}

	constructor (
		private index: number,
		private players: Player[],
		private competitorOne: Competitor,
		private competitorTwo: Competitor,
		private onConclude: () => void
	) {
		// initialize drawn cards
		this.competitorOne.reset();
		this.competitorTwo.reset();

		const initialize = async () => {
			for (let repetition = 0; repetition < initialCardCount; repetition++) {
				this.draw();
				await Game.sleep(0.5);
			}

			this.broadcast({
				roundStart: true
			});
		}

		initialize();
	}

	stay() {
		this.continuosStayCounter++;

		this.broadcast({
			stay: {
				id: this.currentCompetitor.player.id
			}
		});

		this.endTurn();
	}

	draw() {
		this.continuosStayCounter = 0;

		const card = this.deck.draw();
		this.currentCompetitor.draw(card);

		for (const player of this.players) {
			// the first 2 cards of each competitor are hidden
			if (player.id == this.currentCompetitor.player.id || this.turns > 4) {
				player.send({
					draw: {
						id: this.currentCompetitor.player.id,
						card: card
					}
				});
			} else {
				player.send({
					hiddenDraw: {
						id: this.currentCompetitor.player.id
					}
				});
			}
		}

		this.endTurn();
	}

	private endTurn() {
		this.turns++;

		// no more cards left or both players stayed in succession ends the round
		if (this.deck.empty || this.continuosStayCounter == 2) {
			this.conclude();
		}
	}

	private conclude() {
		// tie if both overshot or have the same sum
		if (this.competitorOne.sum <= this.perfectSum || this.competitorTwo.sum <= this.perfectSum) {
			if (this.competitorOne.sum > this.perfectSum) {
				this.competitorTwo.takeDamage(this.bet);
			} else if (this.competitorTwo.sum > this.perfectSum) {
				this.competitorOne.takeDamage(this.bet);
			} else if (this.competitorOne.sum > this.competitorTwo.sum) {
				this.competitorTwo.takeDamage(this.bet);
			} else if (this.competitorTwo.sum > this.competitorOne.sum) {
				this.competitorOne.takeDamage(this.bet);
			}
		}

		this.onConclude();
	}

	private broadcast(message: ServerMessage) {
		for (const player of this.players) {
			player.send(message);
		}
	}
}