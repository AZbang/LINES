const helper = require('../mixins/helper');

class Settings {
	constructor(game) {
		this.game = game;

		this.scene = $('#settings');

		this.propMusic = $('#propMusic');
		this.propEffect = $('#propEffect');
		this.propLang = $('#propLang');
		this.propReset = $('#propReset');

		this.curLang = localStorage.getItem('lang')-0 || 0;
		this.langs = ['en', 'ru'];
		this.lang = this.langs[this.curLang];

		this.isMusic = true;
		this.isGraphics = true;

		this._bindEvents();
	}
	_bindEvents() {
		this.propMusic.children().on('click', () => this.toggleMusic());
		this.propEffect.children().on('click', () => this.toggleEffect());
		this.propLang.children().on('click', () => this.selectLang());
		this.propReset.children().on('click', () => this.resetGame());
	}

	toggleMusic() {
		this.isMusic = !this.isMusic;

		this.propMusic.children().html(this.isMusic ? 'ON' : 'OFF');
		this.isMusic ? this.game.music.play() : this.game.music.stop();
	}
	resetGame() {
		localStorage.setItem('currentLevel', 0);
	}
	toggleEffect() {
		this.isGraphics = !this.isGraphics;

		this.propEffect.children().html(this.isGraphics ? 'ON' : 'OFF');
		this.game.effect.toggle(this.isGraphics);
	}
	selectLang() {
		this.curLang = helper.inRangeArray(this.curLang + 1, this.langs);
		this.lang = this.langs[this.curLang];

		this.propLang.children().html(this.lang.toUpperCase());
		localStorage.setItem('lang', this.curLang);
	}
}

module.exports = Settings;
