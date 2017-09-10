const Game = require('./Game');

var ready = function() {
	var game = new Game({
		play: {
			currentLevel: 0
		},
		effect: {
			particles: Math.round(window.innerWidth/50),
			image: './assets/img/particle.png',
			config: {
				r: [20, 100],
				x: [0, window.innerWidth],
				y: [0, window.innerHeight],
				vecX: [-.5, .5],
				vecY: [-.5, .5],
				alpha: [.1, .2],
				blur: [.7, .8]
			}
		},
		music: {
			file: 'assets/music/loneliness.ogg',
			volume: 0.5,
			loop: true
		},
		repository: 'https://raw.githubusercontent.com/AZbang/LINES_CONSTRUCTOR/master/levels',
		edition: 'PAID'
	});
}

if(window.cordova) document.addEventListener('deviceready', ready, false)
else window.onload = ready;
