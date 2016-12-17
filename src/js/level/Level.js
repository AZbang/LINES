var helper = require('../mixins/helper');
var CirclesManager = require('./CirclesManager');
var AreasManager = require('./AreasManager');
var PathManager = require('./PathManager');

class Level {
	constructor(play, isNew, config) {
		this.game = play.game;
		this.play = play;
		this.config = config || {}
		this.isNew = isNew;

		this.svg = this.play.paper.svg(0, 0, this.game.w, this.game.h);

		this.currentWindow = 0;

		this.label = this.config.label || 'LEVEL';
		this.stepsLeft = this.config.steps || 0;
		this.intersectionsLeft = this.config.intersections || 0;

		this.clicks = localStorage.getItem('clicks')-0 || 0;
		this.currentHint = localStorage.getItem('currentHint')-0 || 0;

		this.game.ads.load();
		this._loadLevel();
		this.update();
	}

	_loadLevel() {
		this.areas = new AreasManager(this, this.config.areas);
		this.hints = new CirclesManager(this);
		this.userPath = new PathManager(this);
		this.circles = new CirclesManager(this, this.config.objects);
		this.user = new CirclesManager(this);

		this.game.interface.selectButtons({
			restart:  !!~this.config.buttons.indexOf('R'),
			closePath: !!~this.config.buttons.indexOf('Z'),
			hint: false
		});

		this.game.interface.hint.css('right', !!~this.config.buttons.indexOf('Z') ? 210 : 120);

		if (this.isNew && this.config.windows) this.nextWindow();
	}
	update() {
		if(this.clicks >= this.config.clicks) {
			this.game.interface.selectButtons({hint: true});
		}
	}

	checkLevelOver() {
		this.checkCollisionLineWithCircle();
		if (this.intersectionsLeft <= 0) {
			this.play.isLevelOver = true;

			setTimeout(() => {
				this.game.levelOverClicks++;
				if(this.game.levelOverClicks > 2) {
					this.game.ads.show();
					this.game.levelOverClicks = 0;
				}

				localStorage.setItem('clicks', 0);
				localStorage.setItem('currentHint', 0);

				this.play.isLevelOver = false;
				this.play.nextLevel();
			}, 1000);
		}
	}

	checkCollisionLineWithCircle() {
		var last = this.userPath.points.length-1;

		//if created user points more 1
		if (last) {

			for (var i = 0; i < this.circles.circles.length; i++) {
				var circle = this.circles.circles[i];
				
				//use last two user points
				var p1 = this.userPath.points[last];
				var p2 = this.userPath.points[last - 1];

				//if collision true, animating currrent point
				if (helper.getHeightTriangle(p1.x, p1.y, p2.x, p2.y, circle.x, circle.y) < circle.r) {
					circle.startCrossAnimation();

					if (!circle.isCollision) circle.crossEvent();
					circle.isCollision = true;
				}
			}
		}
	}

	showHint() {
		this.clicks = Math.min(this.clicks, this.config.hints.length*this.config.clicks);
		this.hints.deleteCircles();

		this.currentHint = Math.round(this.clicks/this.config.clicks);
		localStorage.setItem('currentHint', this.currentHint);

		var pos;
		for(var i = 0; i < this.currentHint; i++) {
			pos = this.config.hints[i];
			this.hints.addCircle(this.game.centerX+pos.x, this.game.centerY+pos.y, 'hint');
		}

		this.game.interface.selectButtons({hint: true})
	}

	nextWindow() {
		var winds = this.config.windows[this.game.settings.lang];
		if(!winds || this.currentWindow > winds.length - 1) return;

		this.game.windowManager.addWindow(winds[this.currentWindow], () => this.nextWindow());
		this.currentWindow++;
	}

	closePath() {
		if(!this.isLevelClosePath && this.user.circles.length) {
			this.isLevelClosePath = true;
			this.userPath.closePath();
			this.checkLevelOver();
		}
	}
}

module.exports = Level;