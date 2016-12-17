class CrossCircle {
	constructor(manager, x, y) {
		this.manager = manager;
		
		this.circle = this.manager.group.circle(x, y, 0);
		this.circle.attr({
				fill: 'rgb(228, 78, 78)',
				strokeWidth: 3
		});
		this.circle.animate({
			r: 25
		}, 1000, mina.elastic);

		this.type = 'cross';
		this.x = x;
		this.y = y;
		this.r = 25;

	}
	startCrossAnimation() {
		this.circle.animate({
			fill: '#8BC34A'
		}, 1000);
	}
	crossEvent() {
		this.manager.level.intersectionsLeft--;
	}
}

module.exports = CrossCircle;