const UserCircle = require('./UserCircle');
const CrossCircle = require('./CrossCircle');
const UncrossCircle = require('./UncrossCircle');
const HintCircle = require('./HintCircle');

class CirclesManager {
	constructor(level, config) {
		this.level = level;
		this.game = this.level.game;
		this.group = this.level.svg.g();

		this.circles = [];

		config && this._parseConfig(config);
	}

	_parseConfig(config) {
		for(var i = 0; i < config.length; i++) {
			var circle = config[i];
			this.addCircle(
				this.level.game.centerX + circle.x, 
				this.level.game.centerY + circle.y, 
				circle.type
			);
		}
	}
	deleteCircles() {
		for(var i = 0; i < this.circles.length; i++) {
			this.circles[i].circle.remove();
		}
		this.circles = [];
	}

	addCircle(x, y, type) {
		var c = new CirclesManager.types[type](this, x, y);
		this.circles.push(c);
	}
}
CirclesManager.types = {
	user: UserCircle,
	uncross: UncrossCircle,
	cross: CrossCircle,
	hint: HintCircle
};

module.exports = CirclesManager;