// scenes
var CanvasEffect = require('./scenes/CanvasEffect');
var Settings = require('./scenes/Settings');
var Interface = require('./scenes/Interface');
var Menu = require('./scenes/Menu');
var Play = require('./scenes/Play');
var Splash = require('./scenes/Splash');

// mixins
var Navigation = require('./mixins/Navigation');
var WindowManager = require('./mixins/WindowManager');
var AjaxRequests = require('./mixins/AjaxRequests');
var helper = require('./mixins/helper');

class Game {
	constructor(config) {
		$('#splash').fadeOut();

		this.edition = config.edition || 'FREE';
		this.notifications = require('./mixins/notifications');
		this.ads = require('./mixins/ads');
		this.notifications(this);
		this.ads.init(this);

		this.zoom = $(window).width()/1000 > 1 ? 1 : $(window).width()/1000;
		$('body').css('zoom', this.zoom);

		this.w = Math.round($(window).width()/this.zoom);
		this.h = Math.round($(window).height()/this.zoom);
		this.centerX = this.w/2;
		this.centerY = this.h/2;

		this.levelOverClicks = 0;
		this.restartClicks = 0;

		this.navigation = new Navigation(this);
		this.windowManager = new WindowManager(this);
		this.ajaxRequests = new AjaxRequests(this, config.repository);

		this.effect = new CanvasEffect(this, config.effect);
		this.play = new Play(this, config.play);
		this.settings = new Settings(this);
		this.interface = new Interface(this);
		this.menu = new Menu(this);
		this.splash = new Splash(this);

		this.navigation.toMenu();

		this.music = AudioFX(config.music.file, {
			volume:   0.5,
			loop:     true,
			autoplay: true 
		});
	}
}

module.exports = Game;