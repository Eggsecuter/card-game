import { Component } from "@acryps/page";
import { GameComponent } from ".";
import { CompetitorComponent } from "./competitor";
import { PlayerMessage, ServerMessage } from "../../shared/messages";
import { ControlsComponent } from "./controls";
import { Player } from "./player";

export class BoardComponent extends Component {
	declare parent: GameComponent;

	activeCompetitorId: string;

	private front: CompetitorComponent;
	private back: CompetitorComponent;

	private winnerMessage: string;

	constructor (
		competitorFront: Player,
		competitorBack: Player,
	) {
		super();

		this.front = new CompetitorComponent(competitorFront);
		this.back = new CompetitorComponent(competitorBack);
	}

	onload() {
		this.parent.socket.onmessage = event => {
			const data = JSON.parse(event.data) as ServerMessage;

			if ('stay' in data) {
				this.activeCompetitorId = data.stay.next.id;

				this.update();
			}

			if ('draw' in data) {
				if (this.winnerMessage) {
					this.front.reset();
					this.back.reset();
					this.winnerMessage = '';
				}

				this.getCompetitor(data.draw).draw(data.draw.card);
				this.activeCompetitorId = data.draw.next.id;

				this.update();
			}

			if ('conclude' in data) {
				this.getCompetitor(data.conclude.competitorOne).conclude(data.conclude.competitorOne);
				this.getCompetitor(data.conclude.competitorTwo).conclude(data.conclude.competitorTwo);

				const winner = this.getCompetitor(data.conclude.winner);

				if (!winner) {
					this.winnerMessage = 'It is a tie';
				} else {
					this.winnerMessage = `${winner.player.name} wins`;
				}

				this.update();
			}
		}
	}

	render() {
		return <ui-board>
			{this.back}
			{this.winnerMessage}
			{this.front}

			{this.activeCompetitorId == this.parent.playerId ? new ControlsComponent() : ''}
		</ui-board>;
	}

	private getCompetitor(message: PlayerMessage) {
		if (message.id == this.front.player.id) {
			return this.front;
		} else if (message.id == this.back.player.id) {
			return this.back;
		}
	}
}