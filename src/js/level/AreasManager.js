const helper = require('../mixins/helper');
const TouchArea = require('./TouchArea');
const UntouchArea = require('./UntouchArea');

class AreasManager {
	constructor(level, config) {
		this.level = level;
		this.game = this.level.game;
		this.group = this.level.svg.g();

		this.areas = [];

		this._parseConfig(config || []);
	}

	_parseConfig(config) {
		if (config.length) {
			for (var i = 0; i < config.length; i++) {
				var area = config[i];
				this.addArea(
					this.level.game.centerX + area.x, 
					this.level.game.centerY + area.y, 
					area.w, 
					area.h, 
					area.type
				);
			}
		} else {
			this.addArea(0, 0, this.level.game.w, this.level.game.h, 'touch');
		}
	}
	deleteAreas() {
		for(var i = 0; i < this.areas.length; i++) {
			this.areas.rect.remove();
		}
		this.areas = [];
	}
	activateArea(x, y) {
		for(var i = 0; i < this.areas.length; i++) {
			var r = this.areas[i];
			if(helper.isContains(r.x, r.y, r.w, r.h, x, y)) return this.areas[i].touchEvent();
		}
	}

	addArea(x, y, w, h, type) {
		var a = new AreasManager.types[type](this, x, y, w, h);
		this.areas.push(a);
	}
}

AreasManager.types = {
	touch: TouchArea,
	untouch: UntouchArea
}

module.exports = AreasManager;