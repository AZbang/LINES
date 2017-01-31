const Level = require('../level/Level');

class Play {
	constructor(game) {
		this.game = game;

		this.scene = $('#game');
		this.paper = Snap('svg');
		this.paper.attr({
			width: this.game.w,
			height: this.game.h
		});

		this.currentLevel = localStorage.getItem('currentLevel') - 0 || 0;
		this.levels = localStorage.getItem('levels') ? JSON.parse(localStorage.getItem('levels')) : require('../levels');
		this.isLevelOver = false;

		this._bindEvents();
	}
	_bindEvents() {
		$('#game').on('click', (e) => this.userAction(e));
		$('#interface').on('click', (e) => this.userAction(e));
	}

	resize() {
		this.paper.attr({
			width: this.game.w,
			height: this.game.h
		});

		this.restartLevel();
	}

	userAction(e) {
		if(e.target.tagName === 'BUTTON') return;

		var x = Math.round(e.clientX/this.game.zoom);
		var y = Math.round(e.clientY/this.game.zoom);

		if(this.level.areas.activateArea(x, y) && this.level.stepsLeft && !this.isLevelOver) {
			this.level.stepsLeft--;
			this.level.clicks++;
			this.level.update();
			this.level.userPath.addPoint(x, y);
			this.level.user.addCircle(x, y, 'user');
			this.level.checkLevelOver();
			this.game.interface.updateGameInfo();
			localStorage.setItem('clicks', this.level.clicks);
		}
	}

	loadLevel(lvl = this.currentLevel, isNew = true) {
		if(this.levels[lvl]) {
			this.currentLevel = lvl;

			this.deleteLevel();
			this.level = new Level(this, isNew, this.levels[lvl]);
			this.game.interface.updateGameInfo();

			localStorage.setItem('currentLevel', this.currentLevel);
		} else {
			this.game.ajaxRequests.requestNewLevels();
		}
	}
	deleteLevel() {
		if(this.level) {
			this.level.svg.remove();
			this.level = null;
		}
	}

	nextLevel() {
		if(!this.isLevelOver) {
			this.loadLevel(this.currentLevel+1, true);
		}		
	}
	backLevel() {
		if(!this.isLevelOver) {
			this.loadLevel(this.currentLevel-1, true);
		}		
	}
	restartLevel() {
		if(!this.isLevelOver) {
			this.loadLevel(this.currentLevel, false);
		}
	}
}

module.exports = Play; 