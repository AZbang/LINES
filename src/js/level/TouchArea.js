class TouchArea {
	constructor(manager, x, y, w, h) {
		this.manager = manager;

		this.rect = this.manager.group.rect(x, y, w, h);
		this.rect.attr({
			fill: 'transparent',
			stroke: '#fff',
			strokeWidth: 5
		});

		this.type = 'touch';
		this.x = x || 0;
		this.y = y || 0;
		this.w = w || 0;
		this.h = h || 0;
	}
	touchEvent() {
		return true;
	}
}

module.exports = TouchArea;