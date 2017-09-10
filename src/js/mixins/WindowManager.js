class WindowManager {
	constructor(game) {
		this.game = game;

		this.closingSpeed = 300;
		this.isClosing = false;

		this.window = $('#window');
		this.content = $('#content');
		this.label = this.window.find('h1');
		this.text = this.window.find('p');
		this.button = this.window.find('button');

		// callback
		this.on;

		this._bindEvents();
		this.close();
	}
	_bindEvents() {
		this.button.on('click', (() => {
			this.window.fadeOut(() => this.close());
			setTimeout(() => this.on && this.on(), 1000);
		}));
	}
	addWindow(config, cb) {
		this.label.html(config.label);
		this.text.html(config.text);
		this.on = cb;

		this.open();
	}
	open() {
		this.window.show();
	}
	close() {
		this.window.hide();
	}
}

module.exports = WindowManager;
