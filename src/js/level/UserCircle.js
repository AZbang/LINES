class UserCircle {
	constructor(manager, x, y) {
		this.manager = manager;
		
		this.circle = this.manager.group.circle(x, y, 0);
		this.circle.attr({
			fill: '#fff'
		});
		this.circle.animate({
			r: 20
		}, 1000, mina.elastic);

		this.type = 'user';
		this.r = 20;
	}
}

module.exports = UserCircle;