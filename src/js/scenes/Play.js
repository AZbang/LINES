const Level = require('../level/Level');
const helper = require('../mixins/helper');

class Play {
	constructor(game) {
		this.game = game;

		this.scene = $('#game');
		this.paper = Snap('svg');
		this.paper.attr({
			width: this.game.w,
			height: this.game.h
		});

		this.currentLevel = +localStorage.getItem('currentLevel') || 0;
		this.levels = localStorage.getItem('levels') ? JSON.parse(localStorage.getItem('levels')) : require('../levels');
		this.isLevelOver = false;

		var g = this.paper.gradient("r(0.5, 0.5, 0.5)#fff-rgba(255, 255, 255, 0)");
		this.trajectoryLine =
			this.paper
				.path('')
				.attr({
					fill: 'transparent',
					stroke: g,
					strokeWidth: 3,
					strokeDasharray: '3px'
				});


		this._bindEvents();
	}
	_bindEvents() {
		$('#interface').on('click', (e) => this.userAction(e));

		if(helper.mobileAndTabletcheck()) {
			$('#game').on('touchstart', (e) => {
				this.trajectoryLineShow(e.touches[0]);
				$('#game').on('touchmove', (e) => {
					this.trajectoryLineShow(e.touches[0]);
				});
			});

			$('#game').on('touchend', (e) => {
				$('#game').off('touchmove');
				this.userAction(e);
				this.trajectoryLine.attr({d: ''});
			});
		} else {
			$('#game').on('mousedown', (e) => {
				this.trajectoryLineShow(e);
				$('#game').on('mousemove', (e) => {
					this.trajectoryLineShow(e);
				});
			});
			$('#game').on('mouseup', (e) => {
				$('#game').off('mousemove');
				this.userAction(e);
				this.trajectoryLine.attr({d: ''});
			})
		}
	}
	trajectoryLineShow(e) {
		if(!this.level.userPath.points.length || !this.level.stepsLeft) return;

		let p = this.level.userPath.points[this.level.userPath.points.length-1];
		var lower = helper.getlongСoordsLine(p.x, p.y, e.clientX/this.game.zoom, e.clientY/this.game.zoom, 1.5);
		var upper = helper.getlongСoordsLine(e.clientX/this.game.zoom, e.clientY/this.game.zoom, p.x, p.y, 2);

		this.trajectoryLine.attr({
			d: 'M' +  lower.x + ',' + lower.y + 'L' + upper.x + ',' + upper.y
		});
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

		var x = Math.round((e.clientX || e.changedTouches[0].clientX)/this.game.zoom);
		var y = Math.round((e.clientY || e.changedTouches[0].clientY)/this.game.zoom);

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
