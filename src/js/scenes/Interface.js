var helper = require('../mixins/helper');

class Interface {
	constructor(game) {
		this.game = game;

		this.scene = $('#interface');

		this.label = $('#label');
		this.steps = $('#steps');
		this.intersections = $('#intersections');
		
		this.restart = $('#restart');
		this.hint = $('#hint');
		this.closePath = $('#closePath');

		this._bindEvents();
	}

	_bindEvents() {
		this.restart.on('click', () => {
			this.game.restartClicks++;
			if(this.game.restartClicks > 20) {
				this.game.ads.show();
				this.game.restartClicks = 0;
			}

			this.game.play.restartLevel();
		});

		this.closePath.on('click', () => {
			this.game.play.level.closePath();
		});

		this.hint.on('click', () => {
			if(Math.round(this.game.play.level.clicks/this.game.play.level.config.clicks) > this.game.play.level.currentHint) {
				this.game.ads.show();
			}

			this.game.play.level.showHint();
		});
	}

	selectButtons(config) {
		for(let key in config)
			this[key] && config[key] ? this[key].show() : this[key].hide();
	}

	updateGameInfo() {
		this.intersections.html('INTERSECTIONS ' + this.game.play.level.intersectionsLeft);
		this.steps.html('STEPS ' + this.game.play.level.stepsLeft);
		this.label.html(this.game.play.level.label);
	}
}

module.exports = Interface;