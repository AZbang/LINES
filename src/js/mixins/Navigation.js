class Navigation {
	constructor(game) {
		this.game = game;

		this._bindEvents();
	}
	_bindEvents() {
		// Cordova API
		document.addEventListener('pause', this.pause.bind(this), false);
		document.addEventListener('resume', this.resume.bind(this), false);
	}

	toMenu() {
		this.game.splash.show();
		this.game.menu.scene.show();
		this.game.interface.scene.hide();
		this.game.play.scene.hide();
		this.game.settings.scene.hide();
	}

	toSettings() {
		this.game.splash.show();
		this.game.settings.scene.show();
		this.game.menu.scene.hide();
		this.game.interface.scene.hide();
		this.game.play.scene.hide();
	}

	toPlay() {
		this.game.splash.show();
		this.game.play.scene.show();
		this.game.interface.scene.show();
		this.game.settings.scene.hide();
		this.game.menu.scene.hide();

		this.game.play.loadLevel();
	}

	pause() {
		this.game.music.stop();
		this.game.effect.toggle(false);
	}

	resume() {
		this.game.settings.isMusic && this.game.music.play();
		this.game.effect.toggle(true);
	}
}

module.exports = Navigation;