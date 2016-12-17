class CrossCircle {
	constructor(manager, x, y) {
		this.manager = manager;
		
		this.circle = this.manager.group.circle(x, y, 35);
		this.circle.attr({
			fill: 'rgba(225, 225, 225, 0.3)',
			stroke: '#fff',
			strokeWidth: 2,
			r: 0
		});
		this.circle.animate({
			r: 30
		}, 500, mina.elastic);

		this.type = 'hint';
		this.r = 35;
	}
}

module.exports = CrossCircle;