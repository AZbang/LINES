class UncrossCircle {
	constructor(manager, x, y) {
		this.manager = manager;
		
		this.circle = this.manager.group.circle(x, y, 25);
		this.circle.attr({
			r: 25,
			fill: 'rgba(103, 58, 183)',
			opacity: .63,
			strokeWidth: 3
		});

		this.type = 'uncross';
		this.x = x;
		this.y = y;
		this.r = 25;

	}
	startCrossAnimation() {
		this.circle.animate({
			r: 20,
			fill: '#fff'
		}, 500);
	}
	crossEvent() {
		this.manager.level.intersectionsLeft = 'X';
		this.manager.level.stepsLeft = 0;	
	}
}

module.exports = UncrossCircle;