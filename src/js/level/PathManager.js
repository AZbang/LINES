class PathManager {
	constructor(level) {
		this.level = level;
		this.game = this.level.game;
		this.path = this.level.svg.path('');
		this.path.attr({
			fill: 'transparent',
			stroke: '#fff',
			strokeWidth: 3
		});

		this.points = [];
	}
	addPoint(x, y) {
		var d = this.path.attr('d');
		this.path.attr({
			d: `${d}${this.points.length ? 'L' : 'M'}${x},${y}`
		});

		this.points.push({x, y});
	}
	closePath() {
		var d = this.path.attr('d');
		this.path.attr({
			d: `${d} Z`
		});

		this.addPoint(this.points[0].x, this.points[0].y);
	}
}

module.exports = PathManager;