class Splash {
	constructor(game) {
		this.game = game;
		
		this.splash = $('#splash');
	}

	show(cb) {
		this.splash
			.css({
				opacity: 1,
				display: 'block'
			})
			.fadeOut(400, cb);
	}
}

module.exports = Splash;