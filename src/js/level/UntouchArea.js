class UntouchArea {
	constructor(manager, x, y, w, h) {
		this.manager = manager;

		this.rect = this.manager.group.rect(x, y, w, h);
		this.rect.attr({
			fill: 'transparent',
			stroke: '#FF3535',
			opacity: 0.8,
			strokeWidth: 5
		});

		this.type = 'untouch';
		this.x = x || 0;
		this.y = y || 0;
		this.w = w || 0;
		this.h = h || 0;
	}
	touchEvent() {
		return false;
	}
}

module.exports = UntouchArea;