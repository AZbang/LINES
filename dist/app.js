(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
			volume: 0.5,
			loop: true,
			autoplay: true 
		});

		// helper method "resizeEnd"
		$(window).resize(function() {
			if(this.resizeTO) clearTimeout(this.resizeTO);

			this.resizeTO = setTimeout(function() {
				$(this).trigger('resizeEnd');
			}, 500);
		});
		$(window).bind('resizeEnd', () => this.resize());
	}
	resize() {
		this.zoom = $(window).width()/1000 > 1 ? 1 : $(window).width()/1000;
		$('body').css('zoom', this.zoom);

		this.w = Math.round($(window).width()/this.zoom);
		this.h = Math.round($(window).height()/this.zoom);
		this.centerX = this.w/2;
		this.centerY = this.h/2;

		this.effect.resize();
		this.play.resize();
	}
}

module.exports = Game;
},{"./mixins/AjaxRequests":14,"./mixins/Navigation":15,"./mixins/WindowManager":16,"./mixins/ads":17,"./mixins/helper":18,"./mixins/notifications":19,"./scenes/CanvasEffect":20,"./scenes/Interface":21,"./scenes/Menu":22,"./scenes/Play":23,"./scenes/Settings":24,"./scenes/Splash":25}],2:[function(require,module,exports){
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
		repository: 'https://raw.githubusercontent.com/AZbang/LINES/master/levels',
		edition: 'FREE'
	});
}

if(window.cordova) document.addEventListener('deviceready', ready, false)
else window.onload = ready;
},{"./Game":1}],3:[function(require,module,exports){
const helper = require('../mixins/helper');
const TouchArea = require('./TouchArea');
const UntouchArea = require('./UntouchArea');

class AreasManager {
	constructor(level, config) {
		this.level = level;
		this.game = this.level.game;
		this.group = this.level.svg.g();

		this.areas = [];

		this._parseConfig(config || []);
	}

	_parseConfig(config) {
		if (config.length) {
			for (var i = 0; i < config.length; i++) {
				var area = config[i];
				this.addArea(
					this.level.game.centerX + area.x, 
					this.level.game.centerY + area.y, 
					area.w, 
					area.h, 
					area.type
				);
			}
		} else {
			this.addArea(0, 0, this.level.game.w, this.level.game.h, 'touch');
		}
	}
	deleteAreas() {
		for(var i = 0; i < this.areas.length; i++) {
			this.areas.rect.remove();
		}
		this.areas = [];
	}
	activateArea(x, y) {
		for(var i = 0; i < this.areas.length; i++) {
			var r = this.areas[i];
			if(helper.isContains(r.x, r.y, r.w, r.h, x, y)) return this.areas[i].touchEvent();
		}
	}

	addArea(x, y, w, h, type) {
		var a = new AreasManager.types[type](this, x, y, w, h);
		this.areas.push(a);
	}
}

AreasManager.types = {
	touch: TouchArea,
	untouch: UntouchArea
}

module.exports = AreasManager;
},{"../mixins/helper":18,"./TouchArea":9,"./UntouchArea":11}],4:[function(require,module,exports){
const UserCircle = require('./UserCircle');
const CrossCircle = require('./CrossCircle');
const UncrossCircle = require('./UncrossCircle');
const HintCircle = require('./HintCircle');

class CirclesManager {
	constructor(level, config) {
		this.level = level;
		this.game = this.level.game;
		this.group = this.level.svg.g();

		this.circles = [];

		config && this._parseConfig(config);
	}

	_parseConfig(config) {
		for(var i = 0; i < config.length; i++) {
			var circle = config[i];
			this.addCircle(
				this.level.game.centerX + circle.x, 
				this.level.game.centerY + circle.y, 
				circle.type
			);
		}
	}
	deleteCircles() {
		for(var i = 0; i < this.circles.length; i++) {
			this.circles[i].circle.remove();
		}
		this.circles = [];
	}

	addCircle(x, y, type) {
		var c = new CirclesManager.types[type](this, x, y);
		this.circles.push(c);
	}
}
CirclesManager.types = {
	user: UserCircle,
	uncross: UncrossCircle,
	cross: CrossCircle,
	hint: HintCircle
};

module.exports = CirclesManager;
},{"./CrossCircle":5,"./HintCircle":6,"./UncrossCircle":10,"./UserCircle":12}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
class CrossCircle {
	constructor(manager, x, y) {
		this.manager = manager;
		
		this.circle = this.manager.group.circle(x, y, 35);
		this.circle.attr({
			fill: 'rgba(225, 225, 225, 0.3)',
			stroke: '#fff',
			strokeWidth: 2,
			r: 0
		});
		this.circle.animate({
			r: 30
		}, 500, mina.elastic);

		this.type = 'hint';
		this.r = 35;
	}
}

module.exports = CrossCircle;
},{}],7:[function(require,module,exports){
var helper = require('../mixins/helper');
var CirclesManager = require('./CirclesManager');
var AreasManager = require('./AreasManager');
var PathManager = require('./PathManager');

class Level {
	constructor(play, isNew, config) {
		this.game = play.game;
		this.play = play;
		this.config = config || {}
		this.isNew = isNew;

		this.svg = this.play.paper.svg(0, 0, this.game.w, this.game.h);

		this.currentWindow = 0;

		this.label = this.config.label || 'LEVEL';
		this.stepsLeft = this.config.steps || 0;
		this.intersectionsLeft = this.config.intersections || 0;

		this.clicks = localStorage.getItem('clicks')-0 || 0;
		this.currentHint = localStorage.getItem('currentHint')-0 || 0;

		this.game.ads.load();
		this._loadLevel();
		this.update();
	}

	_loadLevel() {
		this.areas = new AreasManager(this, this.config.areas);
		this.hints = new CirclesManager(this);
		this.userPath = new PathManager(this);
		this.circles = new CirclesManager(this, this.config.objects);
		this.user = new CirclesManager(this);

		this.game.interface.selectButtons({
			restart:  !!~this.config.buttons.indexOf('R'),
			closePath: !!~this.config.buttons.indexOf('Z'),
			hint: false
		});

		this.game.interface.hint.css('right', !!~this.config.buttons.indexOf('Z') ? 210 : 120);

		if (this.isNew && this.config.windows) this.nextWindow();
	}
	update() {
		if(this.clicks >= this.config.clicks) {
			this.game.interface.selectButtons({hint: true});
		}
	}

	checkLevelOver() {
		this.checkCollisionLineWithCircle();
		if (this.intersectionsLeft <= 0) {
			this.play.isLevelOver = true;

			setTimeout(() => {
				this.game.levelOverClicks++;
				if(this.game.levelOverClicks > 2) {
					this.game.ads.show();
					this.game.levelOverClicks = 0;
				}

				localStorage.setItem('clicks', 0);
				localStorage.setItem('currentHint', 0);

				this.play.isLevelOver = false;
				this.play.nextLevel();
			}, 1000);
		}
	}

	checkCollisionLineWithCircle() {
		var last = this.userPath.points.length-1;

		//if created user points more 1
		if (last) {

			for (var i = 0; i < this.circles.circles.length; i++) {
				var circle = this.circles.circles[i];
				
				//use last two user points
				var p1 = this.userPath.points[last];
				var p2 = this.userPath.points[last - 1];

				//if collision true, animating currrent point
				if (helper.getHeightTriangle(p1.x, p1.y, p2.x, p2.y, circle.x, circle.y) < circle.r) {
					circle.startCrossAnimation();

					if (!circle.isCollision) circle.crossEvent();
					circle.isCollision = true;
				}
			}
		}
	}

	showHint() {
		this.clicks = Math.min(this.clicks, this.config.hints.length*this.config.clicks);
		this.hints.deleteCircles();

		this.currentHint = Math.round(this.clicks/this.config.clicks);
		localStorage.setItem('currentHint', this.currentHint);

		var pos;
		for(var i = 0; i < this.currentHint; i++) {
			pos = this.config.hints[i];
			this.hints.addCircle(this.game.centerX+pos.x, this.game.centerY+pos.y, 'hint');
		}

		this.game.interface.selectButtons({hint: true})
	}

	nextWindow() {
		var winds = this.config.windows[this.game.settings.lang];
		if(!winds || this.currentWindow > winds.length - 1) return;

		this.game.windowManager.addWindow(winds[this.currentWindow], () => this.nextWindow());
		this.currentWindow++;
	}

	closePath() {
		if(!this.isLevelClosePath && this.user.circles.length) {
			this.isLevelClosePath = true;
			this.userPath.closePath();
			this.checkLevelOver();
		}
	}
}

module.exports = Level;
},{"../mixins/helper":18,"./AreasManager":3,"./CirclesManager":4,"./PathManager":8}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
class TouchArea {
	constructor(manager, x, y, w, h) {
		this.manager = manager;

		this.rect = this.manager.group.rect(x, y, w, h);
		this.rect.attr({
			fill: 'transparent',
			stroke: '#fff',
			strokeWidth: 5
		});

		this.type = 'touch';
		this.x = x || 0;
		this.y = y || 0;
		this.w = w || 0;
		this.h = h || 0;
	}
	touchEvent() {
		return true;
	}
}

module.exports = TouchArea;
},{}],10:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){
class UntouchArea {
	constructor(manager, x, y, w, h) {
		this.manager = manager;

		this.rect = this.manager.group.rect(x, y, w, h);
		this.rect.attr({
			fill: 'transparent',
			stroke: '#FF3535',
			opacity: 0.8,
			strokeWidth: 5
		});

		this.type = 'untouch';
		this.x = x || 0;
		this.y = y || 0;
		this.w = w || 0;
		this.h = h || 0;
	}
	touchEvent() {
		return false;
	}
}

module.exports = UntouchArea;
},{}],12:[function(require,module,exports){
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
},{}],13:[function(require,module,exports){
module.exports=[
  {
    "label": "EASY",
    "objects": [
      {
        "type": "cross",
        "x": 0,
        "y": 0
      }
    ],
    "steps": 2,
    "intersections": 1,
    "buttons": "R",
    "windows": {
      "ru": [
        {
          "label": "LINES",
          "text": "В живописи, как и в морали, главное состоит в том, чтобы в нужном месте провести линию — Гилберт Кит Честертон"
        },
        {
          "label": "INFO",
          "text": "Чтобы перезагрузить игру, нажмите R"
        }
      ],
      "en": [
        {
          "label": "LINES",
          "text": "Art, like morality, consists in drawing the line somewhere. — Gilbert Keith Chesterton"
        },
        {
          "label": "INFO",
          "text": "To reset the game, press R"
        }
      ]
    }
  },
  {
    "label": "I ANGULUS",
    "objects": [
      {
        "type": "cross",
        "x": -75,
        "y": -75
      },
      {
        "type": "cross",
        "x": -75,
        "y": 75
      },
      {
        "type": "cross",
        "x": 75,
        "y": -75
      },
      {
        "type": "cross",
        "x": 75,
        "y": 75
      }
    ],
    "steps": 3,
    "intersections": 4,
    "buttons": "R",
    "windows": {
      "ru": [
        {
          "label": "LINES",
          "text": "Конец уже содержится в начале. — Джордж Оруэлл. 1984"          
        },
        {
          "label": "INFO",
          "text": "Нажмите на H, чтобы получить подсказку, когда она появится"
        }
      ],
      "en": [
        {
          "label": "LINES",
          "text": "The end is already contained in the beginning. - George Orwell. 1984"
        },
        {
          "label": "INFO",
          "text": "Press H, to get a clue when it appears"
        }
      ]
    },
    "clicks": 18,
    "hints": [
      {"x": 250, "y": -125},
      {"x": -350, "y": 0},
      {"x": 250, "y": 125}
    ]
  },
  {
    "label": "V and IX",
    "intersections": 9,
    "steps": 4,
    "clicks": 50,
    "objects": [
        {
            "x": 95,
            "y": 95,
            "type": "cross"
        },
        {
            "x": 0,
            "y": 95,
            "type": "cross"
        },
        {
            "x": -95,
            "y": 95,
            "type": "cross"
        },
        {
            "x": -95,
            "y": 0,
            "type": "cross"
        },
        {
            "x": 0,
            "y": 0,
            "type": "cross"
        },
        {
            "x": 95,
            "y": 0,
            "type": "cross"
        },
        {
            "x": 95,
            "y": -95,
            "type": "cross"
        },
        {
            "x": 0,
            "y": -95,
            "type": "cross"
        },
        {
            "x": -95,
            "y": -95,
            "type": "cross"
        }
    ],
    "hints": [
        {
            "x": -268.5,
            "y": 141.5
        },
        {
            "x": 331.5,
            "y": 41.5
        },
        {
            "x": -268.5,
            "y": -58.5
        },
        {
            "x": 331.5,
            "y": -158.5
        }
    ],
    "buttons": "R",
    "areas": null,
    "hintRU": null,
    "hintUS": null
  },
  {
    "label": "III IN A ROW",
    "objects": [
      {
        "type": "cross",
        "x": -50,
        "y": -50
      },
      {
        "type": "cross",
        "x": 0,
        "y": -50
      },
      {
        "type": "cross",
        "x": 50,
        "y": -50
      },
      {
        "type": "cross",
        "x": -50,
        "y": 0
      },
      {
        "type": "cross",
        "x": 0,
        "y": 0
      },
      {
        "type": "cross",
        "x": 50,
        "y": 0
      },
      {
        "type": "cross",
        "x": -50,
        "y": 50
      },
      {
        "type": "cross",
        "x": 0,
        "y": 50
      },
      {
        "type": "cross",
        "x": 50,
        "y": 50
      },
    ],
    "steps": 2,
    "intersections": 5,
    "buttons": "R",
    "windows": {
      "en": [
        {
          "label": "LINES",
          "text": "Do not lose not one who knows all the options of victory, but the one who knows all the options defeat. — Haroun Agatsarsky"
        }
      ],
      "ru": [
        {
          "label": "LINES",
          "text": "Не проигрывает не тот, кто знает все варианты победы, а тот, кто знает все варианты поражения. — Гарун Агацарский"
        }
      ]
    },
    "clicks": 22,
    "hints": [
      {"x": -100, "y": 100},
      {"x": 60, "y": -100}
    ]
  },
  {
    "label": "CONIUNCTIS",
    "intersections": 4,
    "steps": 3,
    "clicks": 50,
    "objects": [
        {
            "x": -230,
            "y": -80,
            "type": "cross"
        },
        {
            "x": 220,
            "y": -80,
            "type": "cross"
        },
        {
            "x": 270,
            "y": 20,
            "type": "cross"
        },
        {
            "x": -280,
            "y": 20,
            "type": "cross"
        }
    ],
    "hints": [
        {
            "x": -5,
            "y": -30
        },
        {
            "x": -130,
            "y": -5
        },
        {
            "x": 120,
            "y": -5
        }
    ],
    "areas": [
        {
            "x": -189,
            "y": -119,
            "w": 368,
            "h": 208,
            "type": "touch"
        }
    ],
    "buttons": "R",
    "windows": {
      "ru": [
        {
          "label": "LINES",
          "text": "Если бы отрезок не считал себя бесконечной прямой, он вряд ли бы дотянул от одной до другой точки — Феликс Кривин"
        }
      ],
      "en": [
        {
          "label": "LINES",
          "text": "If the line segment is not considered himself an infinite straight line, he is unlikely to reach from one to another point — Felix Krivine"
        }
      ]
    }
  },
  {
    "label": "RATS",
    "intersections": 8,
    "steps": 5,
    "objects": [
        {
            "x": -230,
            "y": -30,
            "type": "cross"
        },
        {
            "x": 220,
            "y": -30,
            "type": "cross"
        },
        {
            "x": -30,
            "y": -230,
            "type": "cross"
        },
        {
            "x": 20,
            "y": -230,
            "type": "cross"
        },
        {
            "x": -100,
            "y": 260,
            "type": "cross"
        },
        {
            "x": 100,
            "y": 260,
            "type": "cross"
        },
        {
            "x": -135,
            "y": 225,
            "type": "cross"
        },
        {
            "x": 135,
            "y": 225,
            "type": "cross"
        }
    ],
    "clicks": 50,
    "hints": [
        {
            "x": 145,
            "y": 20
        },
        {
            "x": -80,
            "y": 170
        },
        {
            "x": -5,
            "y": -180
        },
        {
            "x": 70,
            "y": 170
        },
        {
            "x": -155,
            "y": 20
        }
    ],
    "areas": [
        {
            "x": -175,
            "y": -175,
            "w": 350,
            "h": 350,
            "type": "touch"
        }
    ],
    "buttons": "R",
    "windows": {
      "ru": [
        {
          "label": "LINES",
          "text": "Начиная с определенной точки, возврат уже невозможен. Этой точки надо достичь. — Франц Кафка"
        }
      ],
      "en": [
        {
          "label": "LINES",
          "text": "There is a point of no return. This point has to be reached. — Franz Kafka"
        }
      ]
    }
  },
  {
    "label": "TRIGONUS",
    "clicks": 50,
    "objects": [
        {
            "x": -180,
            "y": -5,
            "type": "cross"
        },
        {
            "x": -130,
            "y": -55,
            "type": "cross"
        },
        {
            "x": 170,
            "y": 45,
            "type": "cross"
        },
        {
            "x": 70,
            "y": -55,
            "type": "cross"
        },
        {
            "x": 120,
            "y": 95,
            "type": "cross"
        },
        {
            "x": -80,
            "y": 95,
            "type": "cross"
        }
    ],
    "hints": [
        {
            "x": -280,
            "y": 95
        },
        {
            "x": -30,
            "y": -155
        },
        {
            "x": 220,
            "y": 95
        }
    ],
    "steps": 3,
    "intersections": 6,
    "areas": [
      {
        "x": -300,
        "w": 600,
        "y": -160,
        "h": 340,
        "type": "touch"
      }
    ],
    "buttons": "R Z",
    "windows": {
      "ru": [
        {
          "label": "LINES",
          "text": "Когда пора возвращаться, судьба найдет способ тебя вернуть. — Сара Джио. Фиалки в марте"
        },
        {
          "label": "INFO",
          "text": "Чтобы замкнуть точки линией, нажмите Z"
        }
      ],
      "en": [
        {
          "label": "LINES",
          "text": "Fate has a way of bringing you back when it's time to come back — Sarah Jio. The Violets of March"
        },
        {
          "label": "INFO",
          "text": "To close the line points, press Z"
        }
      ]
    }
  },
  {
    "label": "BEAR",
    "steps": 3,
    "intersections": 6,
    "clicks": 50,
    "buttons": "R Z",
    "objects": [
        {
            "x": -130,
            "y": 70,
            "type": "cross"
        },
        {
            "x": 45,
            "y": 45,
            "type": "cross"
        },
        {
            "x": 245,
            "y": 195,
            "type": "cross"
        },
        {
            "x": 295,
            "y": 70,
            "type": "cross"
        },
        {
            "x": -305,
            "y": -55,
            "type": "cross"
        },
        {
            "x": 70,
            "y": 170,
            "type": "cross"
        }
    ],
    "hints": [
        {
            "x": 245,
            "y": 220
        },
        {
            "x": -330,
            "y": -30
        },
        {
            "x": 70,
            "y": 45
        }
    ],
    "areas": [
        {
            "x": -339,
            "y": -91,
            "w": 69,
            "h": 70,
            "type": "touch"
        },
        {
            "x": 10,
            "y": 11,
            "w": 71,
            "h": 68,
            "type": "touch"
        },
        {
            "x": 212,
            "y": 163,
            "w": 67,
            "h": 66,
            "type": "touch"
        }
    ],
    "hintRU": null,
    "hintUS": null,
    "new": true
  },
  {
    "label": "BACKWARDS",
    "clicks": 50,
    "hints": [
        {
            "x": -80,
            "y": 70
        },
        {
            "x": -5,
            "y": -155
        },
        {
            "x": 95,
            "y": -155
        },
        {
            "x": 45,
            "y": 120
        }
    ],
    "objects": [
      {
        "type": "cross",
        "x": -50,
        "y": 0
      },
      {
        "type": "cross",
        "x": 100,
        "y": -100
      },
      {
        "type": "cross",
        "x": 50,
        "y": 50
      },
      {
        "type": "cross",
        "x": 50,
        "y": 250
      },
      {
        "type": "cross",
        "x": -150,
        "y": 250
      }
    ],
    "areas": [
      {
        "x": -125,
        "w": 325,
        "y": -160,
        "h": 300,
        "type": "touch"
      }
    ],
    "steps": 4,
    "intersections": 5,
    "buttons": "R Z",
    "windows": {
      "ru": [
        {
          "label": "LINES",
          "text": "Мы не отступаем — мы идем в другом направлении. — Дуглас Макартур"
        }
      ],
      "en": [
        {
          "label": "LINES",
          "text": "We are not retreating - we are going in the other direction — Douglas MacArthur"
        }
      ]
    }
  },
  {
    "label": "MALUM",
    "clicks": 5,
    "objects": [
        {
            "x": -5,
            "y": -5,
            "type": "cross"
        },
        {
            "x": 45,
            "y": -5,
            "type": "uncross"
        },
        {
            "x": -55,
            "y": -5,
            "type": "uncross"
        },
        {
            "x": -5,
            "y": -55,
            "type": "uncross"
        },
        {
            "x": -5,
            "y": 45,
            "type": "uncross"
        }
    ],
    "hints": [
        {
            "x": -55,
            "y": 45
        },
        {
            "x": 45,
            "y": -55
        },
        {
            "x": -55,
            "y": -55
        },
        {
            "x": 45,
            "y": 45
        }
    ],
    "steps": 2,
    "intersections": 1,
    "buttons": "R Z",
    "windows": {
      "ru": [
        {
          "label": "LINES",
          "text": "Мы замечаем препятствия, когда отрываем взгляд от цели. — Джозеф Коссман"
        }
      ],
      "en": [
        {
          "label": "LINES",
          "text": "We notice the obstacles, when we do not look at the goal. — Joseph Kossman"
        }
      ]
    }
  },
  {
    "label": "III",
    "clicks": 30,
    "objects": [
        {
            "x": -155,
            "y": 45,
            "type": "cross"
        },
        {
            "x": -80,
            "y": -30,
            "type": "cross"
        },
        {
            "x": -5,
            "y": -105,
            "type": "cross"
        },
        {
            "x": 70,
            "y": -30,
            "type": "cross"
        },
        {
            "x": 145,
            "y": 45,
            "type": "cross"
        },
        {
            "x": -5,
            "y": 170,
            "type": "cross"
        },
        {
            "x": -5,
            "y": -30,
            "type": "uncross"
        },
        {
            "x": 70,
            "y": 95,
            "type": "uncross"
        },
        {
            "x": -80,
            "y": 95,
            "type": "uncross"
        },
        {
            "x": -5,
            "y": 45,
            "type": "uncross"
        },
        {
            "x": 70,
            "y": -155,
            "type": "uncross"
        },
        {
            "x": -80,
            "y": -155,
            "type": "uncross"
        }
    ],
    "hints": [
        {
            "x": -255,
            "y": 170
        },
        {
            "x": 20,
            "y": -180
        },
        {
            "x": 195,
            "y": 170
        }
    ],
    "steps": 3,
    "intersections": 6,
    "buttons": "RZ",
    "areas": null
  },
  {
    "label": "EAZY?",
    "objects": [
      {
        "x": -43,
        "y": -48,
        "type": "cross"
      },
      {
        "x": -42,
        "y": -8,
        "type": "cross"
      },
      {
        "x": -41,
        "y": 29,
        "type": "cross"
      },
      {
        "x": -40,
        "y": 70,
        "type": "cross"
      },
      {
        "x": -39,
        "y": 112,
        "type": "cross"
      },
      {
        "x": -44,
        "y": -83,
        "type": "cross"
      },
      {
        "x": -19,
        "y": -38,
        "type": "cross"
      },
      {
        "x": -2,
        "y": -7,
        "type": "cross"
      },
      {
        "x": 18,
        "y": 23,
        "type": "cross"
      },
      {
        "x": 40,
        "y": 51,
        "type": "cross"
      },
      {
        "x": 57,
        "y": 86,
        "type": "cross"
      },
      {
        "x": 78,
        "y": 114,
        "type": "cross"
      },
      {
        "x": 84,
        "y": 80,
        "type": "cross"
      },
      {
        "x": 86,
        "y": 49,
        "type": "cross"
      },
      {
        "x": 87,
        "y": 20,
        "type": "cross"
      },
      {
        "x": 87,
        "y": -13,
        "type": "cross"
      },
      {
        "x": 87,
        "y": -47,
        "type": "cross"
      },
      {
        "x": 139,
        "y": -84,
        "type": "cross"
      },
      {
        "x": 174,
        "y": -85,
        "type": "cross"
      },
      {
        "x": 220,
        "y": -85,
        "type": "cross"
      },
      {
        "x": 125,
        "y": 2,
        "type": "cross"
      },
      {
        "x": 160,
        "y": 5,
        "type": "cross"
      },
      {
        "x": 198,
        "y": 7,
        "type": "cross"
      },
      {
        "x": 227,
        "y": 7,
        "type": "cross"
      },
      {
        "x": 115,
        "y": 108,
        "type": "cross"
      },
      {
        "x": 156,
        "y": 112,
        "type": "cross"
      },
      {
        "x": 201,
        "y": 110,
        "type": "cross"
      },
      {
        "x": 234,
        "y": 113,
        "type": "cross"
      },
      {
        "x": 92,
        "y": -85,
        "type": "cross"
      },
      {
        "x": 394,
        "y": -52,
        "type": "cross"
      },
      {
        "x": 364,
        "y": -76,
        "type": "cross"
      },
      {
        "x": 320,
        "y": -65,
        "type": "cross"
      },
      {
        "x": 305,
        "y": -22,
        "type": "cross"
      },
      {
        "x": 325,
        "y": 13,
        "type": "cross"
      },
      {
        "x": 369,
        "y": 35,
        "type": "cross"
      },
      {
        "x": 390,
        "y": 73,
        "type": "cross"
      },
      {
        "x": 371,
        "y": 116,
        "type": "cross"
      },
      {
        "x": 329,
        "y": 131,
        "type": "cross"
      },
      {
        "x": 298,
        "y": 123,
        "type": "cross"
      },
      {
        "x": -257,
        "y": -90,
        "type": "cross"
      },
      {
        "x": -257,
        "y": -54,
        "type": "cross"
      },
      {
        "x": -258,
        "y": -13,
        "type": "cross"
      },
      {
        "x": -257,
        "y": 24,
        "type": "cross"
      },
      {
        "x": -259,
        "y": 55,
        "type": "cross"
      },
      {
        "x": -260,
        "y": 102,
        "type": "cross"
      },
      {
        "x": -214,
        "y": 104,
        "type": "cross"
      },
      {
        "x": -173,
        "y": 105,
        "type": "cross"
      },
      {
        "x": -128,
        "y": 72,
        "type": "uncross"
      },
      {
        "x": -128,
        "y": 41,
        "type": "uncross"
      },
      {
        "x": -127,
        "y": 12,
        "type": "uncross"
      },
      {
        "x": -125,
        "y": -21,
        "type": "uncross"
      },
      {
        "x": -124,
        "y": -56,
        "type": "uncross"
      },
      {
        "x": -123,
        "y": -91,
        "type": "uncross"
      },
      {
        "x": -131,
        "y": 111,
        "type": "uncross"
      }
    ],
    "clicks": 50,
    "hints": [
        {
            "x": 95,
            "y": 145
        },
        {
            "x": 120,
            "y": -105
        },
        {
            "x": -180,
            "y": -230
        }
    ],
    "steps": 3,
    "intersections": 20,
    "buttons": "RZ",
    "areas": null,
    "hintRU": null,
    "hintUS": null,
    "new": true
  },
  {
    "label": "CHAOS",
    "clicks": 50,
    "objects": [
        {
            "x": -205,
            "y": -155,
            "type": "cross"
        },
        {
            "x": 95,
            "y": 20,
            "type": "cross"
        },
        {
            "x": 145,
            "y": -80,
            "type": "cross"
        },
        {
            "x": 220,
            "y": -155,
            "type": "cross"
        },
        {
            "x": -30,
            "y": 45,
            "type": "cross"
        },
        {
            "x": -30,
            "y": -130,
            "type": "cross"
        },
        {
            "x": -130,
            "y": -155,
            "type": "cross"
        },
        {
            "x": -239,
            "y": 98,
            "type": "cross"
        },
        {
            "x": 195,
            "y": 95,
            "type": "uncross"
        },
        {
            "x": 120,
            "y": 145,
            "type": "uncross"
        },
        {
            "x": -280,
            "y": 20,
            "type": "uncross"
        },
        {
            "x": -205,
            "y": 170,
            "type": "uncross"
        },
        {
            "x": -130,
            "y": 195,
            "type": "uncross"
        },
        {
            "x": -280,
            "y": 195,
            "type": "uncross"
        },
        {
            "x": -304,
            "y": 78,
            "type": "uncross"
        },
        {
            "x": -105,
            "y": 120,
            "type": "uncross"
        },
        {
            "x": 95,
            "y": -155,
            "type": "uncross"
        },
        {
            "x": 170,
            "y": -230,
            "type": "uncross"
        },
        {
            "x": 20,
            "y": -230,
            "type": "uncross"
        },
        {
            "x": -105,
            "y": -30,
            "type": "uncross"
        },
        {
            "x": -230,
            "y": -80,
            "type": "cross"
        },
        {
            "x": -230,
            "y": 20,
            "type": "uncross"
        },
        {
            "x": 245,
            "y": -55,
            "type": "uncross"
        },
        {
            "x": -5,
            "y": 270,
            "type": "uncross"
        }
    ],
    "hints": [
        {
            "x": -305,
            "y": 120
        },
        {
            "x": 195,
            "y": -5
        },
        {
            "x": -330,
            "y": -205
        },
        {
            "x": -105,
            "y": 45
        },
        {
            "x": 295,
            "y": -205
        }
    ],
    "steps": 5,
    "intersections": 9,
    "buttons": "RZ",
    "areas": null,
    "windows": {
      "ru": [
        {
          "label": "LINES",
          "text": "Жизнь — это прежде всего хаос, в котором ты затерян. Хосе Ортега-и-Гассет"
        }
      ],
      "en": [
        {
          "label": "LINES",
          "text": "Life - is first of all the chaos, in which you lost. Josе Ortega y Gasset"
        }
      ],
    }
  },
  {
    "label": "IMPEDIMENTA",
    "objects": [
      {
        "type": "cross",
        "x": -90,
        "y": -70
      },
      {
        "type": "cross",
        "x": 90,
        "y": -70
      },
      {
        "type": "uncross",
        "x": 55,
        "y": -30
      },
      {
        "type": "uncross",
        "x": -55,
        "y": -30
      },
      {
        "type": "cross",
        "x": 55,
        "y": 30
      },
      {
        "type": "cross",
        "x": -55,
        "y": 30
      },
      {
        "type": "cross",
        "x": 90,
        "y": 70
      },
      {
        "type": "cross",
        "x": -90,
        "y": 70
      },
      {
        "type": "uncross",
        "x": -175,
        "y": 40
      },
      {
        "type": "uncross",
        "x": 175,
        "y": 40
      },
      {
        "type": "uncross",
        "x": 55,
        "y": 200
      },
      {
        "type": "uncross",
        "x": -55,
        "y": 200
      }
    ],
    "clicks": 50,
    "hints": [
        {
            "x": -230,
            "y": -80
        },
        {
            "x": -205,
            "y": 95
        },
        {
            "x": 220,
            "y": 95
        },
        {
            "x": 245,
            "y": -80
        }
    ],
    "steps": 4,
    "intersections": 6,
    "buttons": "R Z",

    "windows": {
      "ru": [
        {
          "label": "LINES",
          "text": "Не тратьте время в поиске препятствий: их может и не существовать. — Франц Кафка"
        }
      ],
      "en": [
        {
          "label": "LINES",
          "text": "Do not waste your time searching for obstacles: they may does not exist. — Franz Kafka"
        }
      ]
    }
  }
]
},{}],14:[function(require,module,exports){
class AjaxRequests {
	constructor(game, repository) {
		this.game = game;
		this.repository = repository;

		this.translates = {
			ask: {
				ru: {
					label: 'INFO',
					text: 'Загрузить новые уровни?'
				},
				en: {
					label: 'INFO',
					text: 'Download new levels?'
				}
			},
			noNewLevels: {
				ru: {
					label: 'INFO',
					text: 'Вы прошли все головоломки в игре. Ожидайте новых уровней каждую неделю!'
				},
				en: {
					label: 'INFO',
					text: 'You passed all the puzzles in the game. Expect new levels every week!'
				}
			},
			failLoadNewLevels: {
				ru: {
					label: 'INFO',
					text: 'Отсутствует соединение с сервером.'
				},
				en: {
					label: 'INFO',
					text: 'No connection to the server.'
				}
			},
		}
	}
	requestNewLevels() {
		var url = `${this.repository}/levels${this.game.play.currentLevel+1}.json`;

		this.game.windowManager.addWindow(this.translates.ask[this.game.settings.lang], () => {
			$.getJSON(url)
				.done((data) => {
					this.game.play.levels = this.game.play.levels.concat(data);
					localStorage.setItem('levels', JSON.stringify(this.game.play.levels));
					this.game.play.loadLevel(this.game.play.currentLevel + 1);
				})
				.fail((err) => {
					var config;

					if (err.status === 404) config = this.translates.noNewLevels[this.game.settings.lang];
					else config = this.translates.failLoadNewLevels[this.game.settings.lang];

					this.game.windowManager.addWindow(config, () => {
						setTimeout(() => this.game.navigation.toMenu(), 300);
					});
				});
		});
	}
}

module.exports = AjaxRequests;
},{}],15:[function(require,module,exports){
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
},{}],16:[function(require,module,exports){
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
			setTimeout(() => this.on && this.on(), 500);
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
},{}],17:[function(require,module,exports){
var ads = {
	init: function(game) {
		ads.game = game;
		ads.isLoad = false;
		if(!window.Cocoon || game.edition === 'PAID') return;

		ads.interstitial = Cocoon.Ad.AdMob.createInterstitial("ad mob key");

		ads.interstitial.on("load", function() {
			ads.isLoad = true;
		});
	},
	load() {
		if(window.Cocoon && ads.game.edition === 'FREE') {
			ads.interstitial.load();
			ads.isLoad = false;
		}
	},
	show() {
		if(window.Cocoon && ads.game.edition === 'FREE') {
			ads.interstitial.show();
		}
	}
}

module.exports = ads;

},{}],18:[function(require,module,exports){
var helper = {
	getHeightTriangle(x, y, x2, y2, x3, y3) {
		//длины сторон треугольника
		var AC = helper.getDistance(x, y, x3, y3);
		var BC = helper.getDistance(x2, y2, x3, y3);
		var AB = helper.getDistance(x, y, x2, y2);

		//полупериметр
		var p = (AC+BC+AB)/2;

		//Формула длины высоты с помощью сторон треугольника
		var h = (2/AB)*Math.sqrt(p*(p-AB)*(p-AC)*(p-BC));

		return h;
	},
	getDistance(x, y, x2, y2) {
		//длины сторон треугольника
		return Math.sqrt(Math.pow(x2-x, 2) + Math.pow(y2-y, 2));
	},
	getlongСoordsLine(x, y, x2, y2, n) {
		var longX = x2 - x;
		var longY = y2 - y;
		
		return {x: x2+longX*n, y: y2+longY*n};
	},
	isContains(rx, ry, rw, rh, x, y) {
		return x >= rx && x <= rx+rw && y >= ry && y <= ry+rh;
	},
	intRandRange(min, max) {
	  	return Math.floor(Math.random() * (max - min + 1)) + min;
	},
	floatRandRange(min, max) {
	  	return +(Math.random() * (max - min) + min).toFixed(1);
	},
	inRangeArray(value, arr) {
		if(value > arr.length-1) return 0;
		else if(value < 0) return arr.length-1;
		else return value;
	}
};

module.exports = helper;
},{}],19:[function(require,module,exports){
var notifications = function(game) {
	if(!window.plugins || !window.plugins.OneSignal) return;

	var notificationOpenedCallback = function(jsonData) {
		console.log('notificationOpenedCallback: ' + JSON.stringify(jsonData));
	};

	window.plugins.OneSignal
		.startInit("OneSignal key", "googlePlay id")
		.handleNotificationOpened(notificationOpenedCallback)
		.endInit();

	window.plugins.OneSignal.sendTag('edition', game.edition);
}

module.exports = notifications;
},{}],20:[function(require,module,exports){
const helper = require('../mixins/helper');

class CanvasEffect {
	constructor(game, config) {
		this.game = game;

		this.scene = $('#effect');
		this.scene[0].width = this.game.w;
		this.scene[0].height = this.game.h;

		this.ctx = this.scene[0].getContext('2d');
		this.isRenderGraphy = true;

		this.particles = [];

		this.image = new Image();
		this.image.onload = () => {
			this.createParticles(config.particles, config.config);
			this.loop();
		}
		this.image.src = config.image;
	}
	toggle(bool) {
		this.isRenderGraphy = bool;
		bool ? this.scene.show() : this.scene.hide();
		bool && this.loop();
	}
	resize() {
		this.scene[0].width = this.game.w;
		this.scene[0].height = this.game.h;		
	}

	loop() {
		if(!this.isRenderGraphy) return;

		this.update();
		this.draw();

		requestAnimationFrame(this.loop.bind(this));
	}
	update() {
		for(let p of this.particles) {
			p.update();
		}
	}

	draw() {
		this.clearScreen();

		for(let p of this.particles) {
			p.draw();
		}
	}
	clearScreen() {
		this.ctx.clearRect(0, 0, this.game.w, this.game.h);
	}

	createParticles(count, config) {
		for(let i = 0; i < count; i++) {
			this.particles.push(new Particle(this, {
				r:     helper.intRandRange(config.r[0], config.r[1]),
				x:     helper.intRandRange(config.x[0], config.x[1]),
				y:     helper.intRandRange(config.y[0], config.y[1]),
				vecX:  helper.intRandRange(config.vecX[0], config.vecY[1]),
				vecY:  helper.intRandRange(config.vecY[0], config.vecY[1]),
				alpha: helper.floatRandRange(config.alpha[0], config.alpha[1])
			}));
		}
	}
}

class Particle {
	constructor(effect, prop) {
		this.effect = effect;
		this.game = this.effect.game;

		this.r = prop.r || 10;
		this.x = prop.x || 0;
		this.y = prop.y || 0;
		this.vecX = prop.vecX || 1;
		this.vecY = prop.vecY || 1;
		this.alpha = prop.alpha || 1;
	}

	update() {
		if(this.x + this.r < 0) {
			this.x = this.game.w+this.r;
			this.vecY = helper.intRandRange(-this.vecY, this.vecY);

		} else if(this.x - this.r > this.game.w) {
			this.x = -this.r;
			this.vecY = helper.intRandRange(-this.vecY, this.vecY);

		} if(this.y + this.r < 0) {
			this.y = this.game.h+this.r;
			this.vecX = helper.intRandRange(-this.vecX, this.vecX);

		} else if(this.y - this.r > this.game.h) {
			this.y = -this.r;
			this.vecX = helper.intRandRange(-this.vecX, this.vecX);
		}

		this.x += this.vecX;
		this.y += this.vecY;
	}
	draw() {
		this.effect.ctx.globalAlpha = this.alpha;
		this.effect.ctx.drawImage(
			this.effect.image,
			this.x-this.r,
			this.y-this.r, 
			this.r*2, 
			this.r*2
		);
	}
}

module.exports = CanvasEffect;
},{"../mixins/helper":18}],21:[function(require,module,exports){
var helper = require('../mixins/helper');

class Interface {
	constructor(game) {
		this.game = game;

		this.scene = $('#interface');

		this.label = $('#label');
		this.steps = $('#steps');
		this.intersections = $('#intersections');
		
		this.restart = $('#restart');
		this.hint = $('#hint');
		this.closePath = $('#closePath');

		this._bindEvents();
	}

	_bindEvents() {
		this.restart.on('click', () => {
			this.game.restartClicks++;
			if(this.game.restartClicks > 20) {
				this.game.ads.show();
				this.game.restartClicks = 0;
			}

			this.game.play.restartLevel();
		});

		this.closePath.on('click', () => {
			this.game.play.level.closePath();
		});

		this.hint.on('click', () => {
			if(Math.round(this.game.play.level.clicks/this.game.play.level.config.clicks) > this.game.play.level.currentHint) {
				this.game.ads.show();
			}

			this.game.play.level.showHint();
		});
	}

	selectButtons(config) {
		for(let key in config)
			this[key] && config[key] ? this[key].show() : this[key].hide();
	}

	updateGameInfo() {
		this.intersections.html('INTERSECTIONS ' + this.game.play.level.intersectionsLeft);
		this.steps.html('STEPS ' + this.game.play.level.stepsLeft);
		this.label.html(this.game.play.level.label);
	}
}

module.exports = Interface;
},{"../mixins/helper":18}],22:[function(require,module,exports){
class Menu {
	constructor(game) {
		this.game = game;

		this.scene = $('#menu');

		this.start = $('.start');
		this.setup = $('.setup');
		this.exit = $('.exit');
		this.tutorial = $('.tutorial');

		this._bindEvents();
		this._createWindows();
	}
	_bindEvents() {
		this.start.on('click', () => this.game.navigation.toPlay());
		this.setup.on('click', () => this.game.navigation.toSettings());
		this.exit.on('click', () => this.game.navigation.toMenu());
		this.tutorial.on('click', () => this.showTutorial());
	}
	_createWindows() {
		if(!localStorage.getItem('isShowInfo')) {
			this.game.windowManager.addWindow({
				"label": "INFO",
				"text": `
					To Settings, press S <br>
					Show Tutorial, press T
				`
			}, () => {
				this.showTutorial();
			});
			localStorage.setItem('isShowInfo', 1);
		}
	}
	showTutorial() {
		this.game.windowManager.addWindow({
			"label": "TUTORIAL",
			"text": "Для прохождения головоломки необходимо пересекать игровые точки линиями, которые вы расставляете нажатиями по экрану, однако запомните, что линии являются бесконечными, но Вы видите только отрезки этих линий! В игре так же присутствуют различный комбинации объектов. Например есть точки, которые нельзя пересекать и так далее, с этим Вам необходимо разобраться и решать головоломки самим!"
		});
	}
}

module.exports = Menu;
},{}],23:[function(require,module,exports){
const Level = require('../level/Level');

class Play {
	constructor(game) {
		this.game = game;

		this.scene = $('#game');
		this.paper = Snap('svg');
		this.paper.attr({
			width: this.game.w,
			height: this.game.h
		});

		this.currentLevel = localStorage.getItem('currentLevel') - 0 || 0;
		this.levels = localStorage.getItem('levels') ? JSON.parse(localStorage.getItem('levels')) : require('../levels');
		this.isLevelOver = false;

		this._bindEvents();
	}
	_bindEvents() {
		$('#game').on('click', (e) => this.userAction(e));
		$('#interface').on('click', (e) => this.userAction(e));
	}

	resize() {
		this.paper.attr({
			width: this.game.w,
			height: this.game.h
		});

		this.restartLevel();
	}

	userAction(e) {
		if(e.target.tagName === 'BUTTON') return;

		var x = Math.round(e.clientX/this.game.zoom);
		var y = Math.round(e.clientY/this.game.zoom);

		if(this.level.areas.activateArea(x, y) && this.level.stepsLeft && !this.isLevelOver) {
			this.level.stepsLeft--;
			this.level.clicks++;
			this.level.update();
			this.level.userPath.addPoint(x, y);
			this.level.user.addCircle(x, y, 'user');
			this.level.checkLevelOver();
			this.game.interface.updateGameInfo();
			localStorage.setItem('clicks', this.level.clicks);
		}
	}

	loadLevel(lvl = this.currentLevel, isNew = true) {
		if(this.levels[lvl]) {
			this.currentLevel = lvl;

			this.deleteLevel();
			this.level = new Level(this, isNew, this.levels[lvl]);
			this.game.interface.updateGameInfo();

			localStorage.setItem('currentLevel', this.currentLevel);
		} else {
			this.game.ajaxRequests.requestNewLevels();
		}
	}
	deleteLevel() {
		if(this.level) {
			this.level.svg.remove();
			this.level = null;
		}
	}

	nextLevel() {
		if(!this.isLevelOver) {
			this.loadLevel(this.currentLevel+1, true);
		}		
	}
	backLevel() {
		if(!this.isLevelOver) {
			this.loadLevel(this.currentLevel-1, true);
		}		
	}
	restartLevel() {
		if(!this.isLevelOver) {
			this.loadLevel(this.currentLevel, false);
		}
	}
}

module.exports = Play; 
},{"../level/Level":7,"../levels":13}],24:[function(require,module,exports){
const helper = require('../mixins/helper');

class Settings {
	constructor(game) {
		this.game = game;

		this.scene = $('#settings');

		this.propMusic = $('#propMusic');
		this.propEffect = $('#propEffect');
		this.propLang = $('#propLang');

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
	}

	toggleMusic() {
		this.isMusic = !this.isMusic;

		this.propMusic.children().html(this.isMusic ? 'ON' : 'OFF');
		this.isMusic ? this.game.music.play() : this.game.music.stop();
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
},{"../mixins/helper":18}],25:[function(require,module,exports){
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
},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2F6YmFuZy9MSU5FUy9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL2hvbWUvYXpiYW5nL0xJTkVTL3NyYy9qcy9HYW1lLmpzIiwiL2hvbWUvYXpiYW5nL0xJTkVTL3NyYy9qcy9mYWtlXzdmNDNhYjcuanMiLCIvaG9tZS9hemJhbmcvTElORVMvc3JjL2pzL2xldmVsL0FyZWFzTWFuYWdlci5qcyIsIi9ob21lL2F6YmFuZy9MSU5FUy9zcmMvanMvbGV2ZWwvQ2lyY2xlc01hbmFnZXIuanMiLCIvaG9tZS9hemJhbmcvTElORVMvc3JjL2pzL2xldmVsL0Nyb3NzQ2lyY2xlLmpzIiwiL2hvbWUvYXpiYW5nL0xJTkVTL3NyYy9qcy9sZXZlbC9IaW50Q2lyY2xlLmpzIiwiL2hvbWUvYXpiYW5nL0xJTkVTL3NyYy9qcy9sZXZlbC9MZXZlbC5qcyIsIi9ob21lL2F6YmFuZy9MSU5FUy9zcmMvanMvbGV2ZWwvUGF0aE1hbmFnZXIuanMiLCIvaG9tZS9hemJhbmcvTElORVMvc3JjL2pzL2xldmVsL1RvdWNoQXJlYS5qcyIsIi9ob21lL2F6YmFuZy9MSU5FUy9zcmMvanMvbGV2ZWwvVW5jcm9zc0NpcmNsZS5qcyIsIi9ob21lL2F6YmFuZy9MSU5FUy9zcmMvanMvbGV2ZWwvVW50b3VjaEFyZWEuanMiLCIvaG9tZS9hemJhbmcvTElORVMvc3JjL2pzL2xldmVsL1VzZXJDaXJjbGUuanMiLCIvaG9tZS9hemJhbmcvTElORVMvc3JjL2pzL2xldmVscy5qc29uIiwiL2hvbWUvYXpiYW5nL0xJTkVTL3NyYy9qcy9taXhpbnMvQWpheFJlcXVlc3RzLmpzIiwiL2hvbWUvYXpiYW5nL0xJTkVTL3NyYy9qcy9taXhpbnMvTmF2aWdhdGlvbi5qcyIsIi9ob21lL2F6YmFuZy9MSU5FUy9zcmMvanMvbWl4aW5zL1dpbmRvd01hbmFnZXIuanMiLCIvaG9tZS9hemJhbmcvTElORVMvc3JjL2pzL21peGlucy9hZHMuanMiLCIvaG9tZS9hemJhbmcvTElORVMvc3JjL2pzL21peGlucy9oZWxwZXIuanMiLCIvaG9tZS9hemJhbmcvTElORVMvc3JjL2pzL21peGlucy9ub3RpZmljYXRpb25zLmpzIiwiL2hvbWUvYXpiYW5nL0xJTkVTL3NyYy9qcy9zY2VuZXMvQ2FudmFzRWZmZWN0LmpzIiwiL2hvbWUvYXpiYW5nL0xJTkVTL3NyYy9qcy9zY2VuZXMvSW50ZXJmYWNlLmpzIiwiL2hvbWUvYXpiYW5nL0xJTkVTL3NyYy9qcy9zY2VuZXMvTWVudS5qcyIsIi9ob21lL2F6YmFuZy9MSU5FUy9zcmMvanMvc2NlbmVzL1BsYXkuanMiLCIvaG9tZS9hemJhbmcvTElORVMvc3JjL2pzL3NjZW5lcy9TZXR0aW5ncy5qcyIsIi9ob21lL2F6YmFuZy9MSU5FUy9zcmMvanMvc2NlbmVzL1NwbGFzaC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4MENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBzY2VuZXNcbnZhciBDYW52YXNFZmZlY3QgPSByZXF1aXJlKCcuL3NjZW5lcy9DYW52YXNFZmZlY3QnKTtcbnZhciBTZXR0aW5ncyA9IHJlcXVpcmUoJy4vc2NlbmVzL1NldHRpbmdzJyk7XG52YXIgSW50ZXJmYWNlID0gcmVxdWlyZSgnLi9zY2VuZXMvSW50ZXJmYWNlJyk7XG52YXIgTWVudSA9IHJlcXVpcmUoJy4vc2NlbmVzL01lbnUnKTtcbnZhciBQbGF5ID0gcmVxdWlyZSgnLi9zY2VuZXMvUGxheScpO1xudmFyIFNwbGFzaCA9IHJlcXVpcmUoJy4vc2NlbmVzL1NwbGFzaCcpO1xuXG4vLyBtaXhpbnNcbnZhciBOYXZpZ2F0aW9uID0gcmVxdWlyZSgnLi9taXhpbnMvTmF2aWdhdGlvbicpO1xudmFyIFdpbmRvd01hbmFnZXIgPSByZXF1aXJlKCcuL21peGlucy9XaW5kb3dNYW5hZ2VyJyk7XG52YXIgQWpheFJlcXVlc3RzID0gcmVxdWlyZSgnLi9taXhpbnMvQWpheFJlcXVlc3RzJyk7XG52YXIgaGVscGVyID0gcmVxdWlyZSgnLi9taXhpbnMvaGVscGVyJyk7XG5cbmNsYXNzIEdhbWUge1xuXHRjb25zdHJ1Y3Rvcihjb25maWcpIHtcblx0XHQkKCcjc3BsYXNoJykuZmFkZU91dCgpO1xuXG5cdFx0dGhpcy5lZGl0aW9uID0gY29uZmlnLmVkaXRpb24gfHwgJ0ZSRUUnO1xuXHRcdHRoaXMubm90aWZpY2F0aW9ucyA9IHJlcXVpcmUoJy4vbWl4aW5zL25vdGlmaWNhdGlvbnMnKTtcblx0XHR0aGlzLmFkcyA9IHJlcXVpcmUoJy4vbWl4aW5zL2FkcycpO1xuXHRcdHRoaXMubm90aWZpY2F0aW9ucyh0aGlzKTtcblx0XHR0aGlzLmFkcy5pbml0KHRoaXMpO1xuXG5cdFx0dGhpcy56b29tID0gJCh3aW5kb3cpLndpZHRoKCkvMTAwMCA+IDEgPyAxIDogJCh3aW5kb3cpLndpZHRoKCkvMTAwMDtcblx0XHQkKCdib2R5JykuY3NzKCd6b29tJywgdGhpcy56b29tKTtcblxuXHRcdHRoaXMudyA9IE1hdGgucm91bmQoJCh3aW5kb3cpLndpZHRoKCkvdGhpcy56b29tKTtcblx0XHR0aGlzLmggPSBNYXRoLnJvdW5kKCQod2luZG93KS5oZWlnaHQoKS90aGlzLnpvb20pO1xuXHRcdHRoaXMuY2VudGVyWCA9IHRoaXMudy8yO1xuXHRcdHRoaXMuY2VudGVyWSA9IHRoaXMuaC8yO1xuXG5cdFx0dGhpcy5sZXZlbE92ZXJDbGlja3MgPSAwO1xuXHRcdHRoaXMucmVzdGFydENsaWNrcyA9IDA7XG5cblx0XHR0aGlzLm5hdmlnYXRpb24gPSBuZXcgTmF2aWdhdGlvbih0aGlzKTtcblx0XHR0aGlzLndpbmRvd01hbmFnZXIgPSBuZXcgV2luZG93TWFuYWdlcih0aGlzKTtcblx0XHR0aGlzLmFqYXhSZXF1ZXN0cyA9IG5ldyBBamF4UmVxdWVzdHModGhpcywgY29uZmlnLnJlcG9zaXRvcnkpO1xuXG5cdFx0dGhpcy5lZmZlY3QgPSBuZXcgQ2FudmFzRWZmZWN0KHRoaXMsIGNvbmZpZy5lZmZlY3QpO1xuXHRcdHRoaXMucGxheSA9IG5ldyBQbGF5KHRoaXMsIGNvbmZpZy5wbGF5KTtcblx0XHR0aGlzLnNldHRpbmdzID0gbmV3IFNldHRpbmdzKHRoaXMpO1xuXHRcdHRoaXMuaW50ZXJmYWNlID0gbmV3IEludGVyZmFjZSh0aGlzKTtcblx0XHR0aGlzLm1lbnUgPSBuZXcgTWVudSh0aGlzKTtcblx0XHR0aGlzLnNwbGFzaCA9IG5ldyBTcGxhc2godGhpcyk7XG5cblx0XHR0aGlzLm5hdmlnYXRpb24udG9NZW51KCk7XG5cblx0XHR0aGlzLm11c2ljID0gQXVkaW9GWChjb25maWcubXVzaWMuZmlsZSwge1xuXHRcdFx0dm9sdW1lOiAwLjUsXG5cdFx0XHRsb29wOiB0cnVlLFxuXHRcdFx0YXV0b3BsYXk6IHRydWUgXG5cdFx0fSk7XG5cblx0XHQvLyBoZWxwZXIgbWV0aG9kIFwicmVzaXplRW5kXCJcblx0XHQkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYodGhpcy5yZXNpemVUTykgY2xlYXJUaW1lb3V0KHRoaXMucmVzaXplVE8pO1xuXG5cdFx0XHR0aGlzLnJlc2l6ZVRPID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0JCh0aGlzKS50cmlnZ2VyKCdyZXNpemVFbmQnKTtcblx0XHRcdH0sIDUwMCk7XG5cdFx0fSk7XG5cdFx0JCh3aW5kb3cpLmJpbmQoJ3Jlc2l6ZUVuZCcsICgpID0+IHRoaXMucmVzaXplKCkpO1xuXHR9XG5cdHJlc2l6ZSgpIHtcblx0XHR0aGlzLnpvb20gPSAkKHdpbmRvdykud2lkdGgoKS8xMDAwID4gMSA/IDEgOiAkKHdpbmRvdykud2lkdGgoKS8xMDAwO1xuXHRcdCQoJ2JvZHknKS5jc3MoJ3pvb20nLCB0aGlzLnpvb20pO1xuXG5cdFx0dGhpcy53ID0gTWF0aC5yb3VuZCgkKHdpbmRvdykud2lkdGgoKS90aGlzLnpvb20pO1xuXHRcdHRoaXMuaCA9IE1hdGgucm91bmQoJCh3aW5kb3cpLmhlaWdodCgpL3RoaXMuem9vbSk7XG5cdFx0dGhpcy5jZW50ZXJYID0gdGhpcy53LzI7XG5cdFx0dGhpcy5jZW50ZXJZID0gdGhpcy5oLzI7XG5cblx0XHR0aGlzLmVmZmVjdC5yZXNpemUoKTtcblx0XHR0aGlzLnBsYXkucmVzaXplKCk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBHYW1lOyIsImNvbnN0IEdhbWUgPSByZXF1aXJlKCcuL0dhbWUnKTtcblxudmFyIHJlYWR5ID0gZnVuY3Rpb24oKSB7XG5cdHZhciBnYW1lID0gbmV3IEdhbWUoe1xuXHRcdHBsYXk6IHtcblx0XHRcdGN1cnJlbnRMZXZlbDogMFxuXHRcdH0sXG5cdFx0ZWZmZWN0OiB7XG5cdFx0XHRwYXJ0aWNsZXM6IE1hdGgucm91bmQod2luZG93LmlubmVyV2lkdGgvNTApLFxuXHRcdFx0aW1hZ2U6ICcuL2Fzc2V0cy9pbWcvcGFydGljbGUucG5nJyxcblx0XHRcdGNvbmZpZzoge1xuXHRcdFx0XHRyOiBbMjAsIDEwMF0sXG5cdFx0XHRcdHg6IFswLCB3aW5kb3cuaW5uZXJXaWR0aF0sXG5cdFx0XHRcdHk6IFswLCB3aW5kb3cuaW5uZXJIZWlnaHRdLFxuXHRcdFx0XHR2ZWNYOiBbLS41LCAuNV0sXG5cdFx0XHRcdHZlY1k6IFstLjUsIC41XSxcblx0XHRcdFx0YWxwaGE6IFsuMSwgLjJdLFxuXHRcdFx0XHRibHVyOiBbLjcsIC44XVxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0bXVzaWM6IHtcblx0XHRcdGZpbGU6ICdhc3NldHMvbXVzaWMvbG9uZWxpbmVzcy5vZ2cnLFxuXHRcdFx0dm9sdW1lOiAwLjUsXG5cdFx0XHRsb29wOiB0cnVlXG5cdFx0fSxcblx0XHRyZXBvc2l0b3J5OiAnaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL0FaYmFuZy9MSU5FUy9tYXN0ZXIvbGV2ZWxzJyxcblx0XHRlZGl0aW9uOiAnRlJFRSdcblx0fSk7XG59XG5cbmlmKHdpbmRvdy5jb3Jkb3ZhKSBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2VyZWFkeScsIHJlYWR5LCBmYWxzZSlcbmVsc2Ugd2luZG93Lm9ubG9hZCA9IHJlYWR5OyIsImNvbnN0IGhlbHBlciA9IHJlcXVpcmUoJy4uL21peGlucy9oZWxwZXInKTtcbmNvbnN0IFRvdWNoQXJlYSA9IHJlcXVpcmUoJy4vVG91Y2hBcmVhJyk7XG5jb25zdCBVbnRvdWNoQXJlYSA9IHJlcXVpcmUoJy4vVW50b3VjaEFyZWEnKTtcblxuY2xhc3MgQXJlYXNNYW5hZ2VyIHtcblx0Y29uc3RydWN0b3IobGV2ZWwsIGNvbmZpZykge1xuXHRcdHRoaXMubGV2ZWwgPSBsZXZlbDtcblx0XHR0aGlzLmdhbWUgPSB0aGlzLmxldmVsLmdhbWU7XG5cdFx0dGhpcy5ncm91cCA9IHRoaXMubGV2ZWwuc3ZnLmcoKTtcblxuXHRcdHRoaXMuYXJlYXMgPSBbXTtcblxuXHRcdHRoaXMuX3BhcnNlQ29uZmlnKGNvbmZpZyB8fCBbXSk7XG5cdH1cblxuXHRfcGFyc2VDb25maWcoY29uZmlnKSB7XG5cdFx0aWYgKGNvbmZpZy5sZW5ndGgpIHtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY29uZmlnLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciBhcmVhID0gY29uZmlnW2ldO1xuXHRcdFx0XHR0aGlzLmFkZEFyZWEoXG5cdFx0XHRcdFx0dGhpcy5sZXZlbC5nYW1lLmNlbnRlclggKyBhcmVhLngsIFxuXHRcdFx0XHRcdHRoaXMubGV2ZWwuZ2FtZS5jZW50ZXJZICsgYXJlYS55LCBcblx0XHRcdFx0XHRhcmVhLncsIFxuXHRcdFx0XHRcdGFyZWEuaCwgXG5cdFx0XHRcdFx0YXJlYS50eXBlXG5cdFx0XHRcdCk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuYWRkQXJlYSgwLCAwLCB0aGlzLmxldmVsLmdhbWUudywgdGhpcy5sZXZlbC5nYW1lLmgsICd0b3VjaCcpO1xuXHRcdH1cblx0fVxuXHRkZWxldGVBcmVhcygpIHtcblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5hcmVhcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dGhpcy5hcmVhcy5yZWN0LnJlbW92ZSgpO1xuXHRcdH1cblx0XHR0aGlzLmFyZWFzID0gW107XG5cdH1cblx0YWN0aXZhdGVBcmVhKHgsIHkpIHtcblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5hcmVhcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHIgPSB0aGlzLmFyZWFzW2ldO1xuXHRcdFx0aWYoaGVscGVyLmlzQ29udGFpbnMoci54LCByLnksIHIudywgci5oLCB4LCB5KSkgcmV0dXJuIHRoaXMuYXJlYXNbaV0udG91Y2hFdmVudCgpO1xuXHRcdH1cblx0fVxuXG5cdGFkZEFyZWEoeCwgeSwgdywgaCwgdHlwZSkge1xuXHRcdHZhciBhID0gbmV3IEFyZWFzTWFuYWdlci50eXBlc1t0eXBlXSh0aGlzLCB4LCB5LCB3LCBoKTtcblx0XHR0aGlzLmFyZWFzLnB1c2goYSk7XG5cdH1cbn1cblxuQXJlYXNNYW5hZ2VyLnR5cGVzID0ge1xuXHR0b3VjaDogVG91Y2hBcmVhLFxuXHR1bnRvdWNoOiBVbnRvdWNoQXJlYVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEFyZWFzTWFuYWdlcjsiLCJjb25zdCBVc2VyQ2lyY2xlID0gcmVxdWlyZSgnLi9Vc2VyQ2lyY2xlJyk7XG5jb25zdCBDcm9zc0NpcmNsZSA9IHJlcXVpcmUoJy4vQ3Jvc3NDaXJjbGUnKTtcbmNvbnN0IFVuY3Jvc3NDaXJjbGUgPSByZXF1aXJlKCcuL1VuY3Jvc3NDaXJjbGUnKTtcbmNvbnN0IEhpbnRDaXJjbGUgPSByZXF1aXJlKCcuL0hpbnRDaXJjbGUnKTtcblxuY2xhc3MgQ2lyY2xlc01hbmFnZXIge1xuXHRjb25zdHJ1Y3RvcihsZXZlbCwgY29uZmlnKSB7XG5cdFx0dGhpcy5sZXZlbCA9IGxldmVsO1xuXHRcdHRoaXMuZ2FtZSA9IHRoaXMubGV2ZWwuZ2FtZTtcblx0XHR0aGlzLmdyb3VwID0gdGhpcy5sZXZlbC5zdmcuZygpO1xuXG5cdFx0dGhpcy5jaXJjbGVzID0gW107XG5cblx0XHRjb25maWcgJiYgdGhpcy5fcGFyc2VDb25maWcoY29uZmlnKTtcblx0fVxuXG5cdF9wYXJzZUNvbmZpZyhjb25maWcpIHtcblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgY29uZmlnLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgY2lyY2xlID0gY29uZmlnW2ldO1xuXHRcdFx0dGhpcy5hZGRDaXJjbGUoXG5cdFx0XHRcdHRoaXMubGV2ZWwuZ2FtZS5jZW50ZXJYICsgY2lyY2xlLngsIFxuXHRcdFx0XHR0aGlzLmxldmVsLmdhbWUuY2VudGVyWSArIGNpcmNsZS55LCBcblx0XHRcdFx0Y2lyY2xlLnR5cGVcblx0XHRcdCk7XG5cdFx0fVxuXHR9XG5cdGRlbGV0ZUNpcmNsZXMoKSB7XG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMuY2lyY2xlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dGhpcy5jaXJjbGVzW2ldLmNpcmNsZS5yZW1vdmUoKTtcblx0XHR9XG5cdFx0dGhpcy5jaXJjbGVzID0gW107XG5cdH1cblxuXHRhZGRDaXJjbGUoeCwgeSwgdHlwZSkge1xuXHRcdHZhciBjID0gbmV3IENpcmNsZXNNYW5hZ2VyLnR5cGVzW3R5cGVdKHRoaXMsIHgsIHkpO1xuXHRcdHRoaXMuY2lyY2xlcy5wdXNoKGMpO1xuXHR9XG59XG5DaXJjbGVzTWFuYWdlci50eXBlcyA9IHtcblx0dXNlcjogVXNlckNpcmNsZSxcblx0dW5jcm9zczogVW5jcm9zc0NpcmNsZSxcblx0Y3Jvc3M6IENyb3NzQ2lyY2xlLFxuXHRoaW50OiBIaW50Q2lyY2xlXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENpcmNsZXNNYW5hZ2VyOyIsImNsYXNzIENyb3NzQ2lyY2xlIHtcblx0Y29uc3RydWN0b3IobWFuYWdlciwgeCwgeSkge1xuXHRcdHRoaXMubWFuYWdlciA9IG1hbmFnZXI7XG5cdFx0XG5cdFx0dGhpcy5jaXJjbGUgPSB0aGlzLm1hbmFnZXIuZ3JvdXAuY2lyY2xlKHgsIHksIDApO1xuXHRcdHRoaXMuY2lyY2xlLmF0dHIoe1xuXHRcdFx0XHRmaWxsOiAncmdiKDIyOCwgNzgsIDc4KScsXG5cdFx0XHRcdHN0cm9rZVdpZHRoOiAzXG5cdFx0fSk7XG5cdFx0dGhpcy5jaXJjbGUuYW5pbWF0ZSh7XG5cdFx0XHRyOiAyNVxuXHRcdH0sIDEwMDAsIG1pbmEuZWxhc3RpYyk7XG5cblx0XHR0aGlzLnR5cGUgPSAnY3Jvc3MnO1xuXHRcdHRoaXMueCA9IHg7XG5cdFx0dGhpcy55ID0geTtcblx0XHR0aGlzLnIgPSAyNTtcblxuXHR9XG5cdHN0YXJ0Q3Jvc3NBbmltYXRpb24oKSB7XG5cdFx0dGhpcy5jaXJjbGUuYW5pbWF0ZSh7XG5cdFx0XHRmaWxsOiAnIzhCQzM0QSdcblx0XHR9LCAxMDAwKTtcblx0fVxuXHRjcm9zc0V2ZW50KCkge1xuXHRcdHRoaXMubWFuYWdlci5sZXZlbC5pbnRlcnNlY3Rpb25zTGVmdC0tO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ3Jvc3NDaXJjbGU7IiwiY2xhc3MgQ3Jvc3NDaXJjbGUge1xuXHRjb25zdHJ1Y3RvcihtYW5hZ2VyLCB4LCB5KSB7XG5cdFx0dGhpcy5tYW5hZ2VyID0gbWFuYWdlcjtcblx0XHRcblx0XHR0aGlzLmNpcmNsZSA9IHRoaXMubWFuYWdlci5ncm91cC5jaXJjbGUoeCwgeSwgMzUpO1xuXHRcdHRoaXMuY2lyY2xlLmF0dHIoe1xuXHRcdFx0ZmlsbDogJ3JnYmEoMjI1LCAyMjUsIDIyNSwgMC4zKScsXG5cdFx0XHRzdHJva2U6ICcjZmZmJyxcblx0XHRcdHN0cm9rZVdpZHRoOiAyLFxuXHRcdFx0cjogMFxuXHRcdH0pO1xuXHRcdHRoaXMuY2lyY2xlLmFuaW1hdGUoe1xuXHRcdFx0cjogMzBcblx0XHR9LCA1MDAsIG1pbmEuZWxhc3RpYyk7XG5cblx0XHR0aGlzLnR5cGUgPSAnaGludCc7XG5cdFx0dGhpcy5yID0gMzU7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDcm9zc0NpcmNsZTsiLCJ2YXIgaGVscGVyID0gcmVxdWlyZSgnLi4vbWl4aW5zL2hlbHBlcicpO1xudmFyIENpcmNsZXNNYW5hZ2VyID0gcmVxdWlyZSgnLi9DaXJjbGVzTWFuYWdlcicpO1xudmFyIEFyZWFzTWFuYWdlciA9IHJlcXVpcmUoJy4vQXJlYXNNYW5hZ2VyJyk7XG52YXIgUGF0aE1hbmFnZXIgPSByZXF1aXJlKCcuL1BhdGhNYW5hZ2VyJyk7XG5cbmNsYXNzIExldmVsIHtcblx0Y29uc3RydWN0b3IocGxheSwgaXNOZXcsIGNvbmZpZykge1xuXHRcdHRoaXMuZ2FtZSA9IHBsYXkuZ2FtZTtcblx0XHR0aGlzLnBsYXkgPSBwbGF5O1xuXHRcdHRoaXMuY29uZmlnID0gY29uZmlnIHx8IHt9XG5cdFx0dGhpcy5pc05ldyA9IGlzTmV3O1xuXG5cdFx0dGhpcy5zdmcgPSB0aGlzLnBsYXkucGFwZXIuc3ZnKDAsIDAsIHRoaXMuZ2FtZS53LCB0aGlzLmdhbWUuaCk7XG5cblx0XHR0aGlzLmN1cnJlbnRXaW5kb3cgPSAwO1xuXG5cdFx0dGhpcy5sYWJlbCA9IHRoaXMuY29uZmlnLmxhYmVsIHx8ICdMRVZFTCc7XG5cdFx0dGhpcy5zdGVwc0xlZnQgPSB0aGlzLmNvbmZpZy5zdGVwcyB8fCAwO1xuXHRcdHRoaXMuaW50ZXJzZWN0aW9uc0xlZnQgPSB0aGlzLmNvbmZpZy5pbnRlcnNlY3Rpb25zIHx8IDA7XG5cblx0XHR0aGlzLmNsaWNrcyA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjbGlja3MnKS0wIHx8IDA7XG5cdFx0dGhpcy5jdXJyZW50SGludCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjdXJyZW50SGludCcpLTAgfHwgMDtcblxuXHRcdHRoaXMuZ2FtZS5hZHMubG9hZCgpO1xuXHRcdHRoaXMuX2xvYWRMZXZlbCgpO1xuXHRcdHRoaXMudXBkYXRlKCk7XG5cdH1cblxuXHRfbG9hZExldmVsKCkge1xuXHRcdHRoaXMuYXJlYXMgPSBuZXcgQXJlYXNNYW5hZ2VyKHRoaXMsIHRoaXMuY29uZmlnLmFyZWFzKTtcblx0XHR0aGlzLmhpbnRzID0gbmV3IENpcmNsZXNNYW5hZ2VyKHRoaXMpO1xuXHRcdHRoaXMudXNlclBhdGggPSBuZXcgUGF0aE1hbmFnZXIodGhpcyk7XG5cdFx0dGhpcy5jaXJjbGVzID0gbmV3IENpcmNsZXNNYW5hZ2VyKHRoaXMsIHRoaXMuY29uZmlnLm9iamVjdHMpO1xuXHRcdHRoaXMudXNlciA9IG5ldyBDaXJjbGVzTWFuYWdlcih0aGlzKTtcblxuXHRcdHRoaXMuZ2FtZS5pbnRlcmZhY2Uuc2VsZWN0QnV0dG9ucyh7XG5cdFx0XHRyZXN0YXJ0OiAgISF+dGhpcy5jb25maWcuYnV0dG9ucy5pbmRleE9mKCdSJyksXG5cdFx0XHRjbG9zZVBhdGg6ICEhfnRoaXMuY29uZmlnLmJ1dHRvbnMuaW5kZXhPZignWicpLFxuXHRcdFx0aGludDogZmFsc2Vcblx0XHR9KTtcblxuXHRcdHRoaXMuZ2FtZS5pbnRlcmZhY2UuaGludC5jc3MoJ3JpZ2h0JywgISF+dGhpcy5jb25maWcuYnV0dG9ucy5pbmRleE9mKCdaJykgPyAyMTAgOiAxMjApO1xuXG5cdFx0aWYgKHRoaXMuaXNOZXcgJiYgdGhpcy5jb25maWcud2luZG93cykgdGhpcy5uZXh0V2luZG93KCk7XG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdGlmKHRoaXMuY2xpY2tzID49IHRoaXMuY29uZmlnLmNsaWNrcykge1xuXHRcdFx0dGhpcy5nYW1lLmludGVyZmFjZS5zZWxlY3RCdXR0b25zKHtoaW50OiB0cnVlfSk7XG5cdFx0fVxuXHR9XG5cblx0Y2hlY2tMZXZlbE92ZXIoKSB7XG5cdFx0dGhpcy5jaGVja0NvbGxpc2lvbkxpbmVXaXRoQ2lyY2xlKCk7XG5cdFx0aWYgKHRoaXMuaW50ZXJzZWN0aW9uc0xlZnQgPD0gMCkge1xuXHRcdFx0dGhpcy5wbGF5LmlzTGV2ZWxPdmVyID0gdHJ1ZTtcblxuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRcdHRoaXMuZ2FtZS5sZXZlbE92ZXJDbGlja3MrKztcblx0XHRcdFx0aWYodGhpcy5nYW1lLmxldmVsT3ZlckNsaWNrcyA+IDIpIHtcblx0XHRcdFx0XHR0aGlzLmdhbWUuYWRzLnNob3coKTtcblx0XHRcdFx0XHR0aGlzLmdhbWUubGV2ZWxPdmVyQ2xpY2tzID0gMDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjbGlja3MnLCAwKTtcblx0XHRcdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2N1cnJlbnRIaW50JywgMCk7XG5cblx0XHRcdFx0dGhpcy5wbGF5LmlzTGV2ZWxPdmVyID0gZmFsc2U7XG5cdFx0XHRcdHRoaXMucGxheS5uZXh0TGV2ZWwoKTtcblx0XHRcdH0sIDEwMDApO1xuXHRcdH1cblx0fVxuXG5cdGNoZWNrQ29sbGlzaW9uTGluZVdpdGhDaXJjbGUoKSB7XG5cdFx0dmFyIGxhc3QgPSB0aGlzLnVzZXJQYXRoLnBvaW50cy5sZW5ndGgtMTtcblxuXHRcdC8vaWYgY3JlYXRlZCB1c2VyIHBvaW50cyBtb3JlIDFcblx0XHRpZiAobGFzdCkge1xuXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2lyY2xlcy5jaXJjbGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciBjaXJjbGUgPSB0aGlzLmNpcmNsZXMuY2lyY2xlc1tpXTtcblx0XHRcdFx0XG5cdFx0XHRcdC8vdXNlIGxhc3QgdHdvIHVzZXIgcG9pbnRzXG5cdFx0XHRcdHZhciBwMSA9IHRoaXMudXNlclBhdGgucG9pbnRzW2xhc3RdO1xuXHRcdFx0XHR2YXIgcDIgPSB0aGlzLnVzZXJQYXRoLnBvaW50c1tsYXN0IC0gMV07XG5cblx0XHRcdFx0Ly9pZiBjb2xsaXNpb24gdHJ1ZSwgYW5pbWF0aW5nIGN1cnJyZW50IHBvaW50XG5cdFx0XHRcdGlmIChoZWxwZXIuZ2V0SGVpZ2h0VHJpYW5nbGUocDEueCwgcDEueSwgcDIueCwgcDIueSwgY2lyY2xlLngsIGNpcmNsZS55KSA8IGNpcmNsZS5yKSB7XG5cdFx0XHRcdFx0Y2lyY2xlLnN0YXJ0Q3Jvc3NBbmltYXRpb24oKTtcblxuXHRcdFx0XHRcdGlmICghY2lyY2xlLmlzQ29sbGlzaW9uKSBjaXJjbGUuY3Jvc3NFdmVudCgpO1xuXHRcdFx0XHRcdGNpcmNsZS5pc0NvbGxpc2lvbiA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRzaG93SGludCgpIHtcblx0XHR0aGlzLmNsaWNrcyA9IE1hdGgubWluKHRoaXMuY2xpY2tzLCB0aGlzLmNvbmZpZy5oaW50cy5sZW5ndGgqdGhpcy5jb25maWcuY2xpY2tzKTtcblx0XHR0aGlzLmhpbnRzLmRlbGV0ZUNpcmNsZXMoKTtcblxuXHRcdHRoaXMuY3VycmVudEhpbnQgPSBNYXRoLnJvdW5kKHRoaXMuY2xpY2tzL3RoaXMuY29uZmlnLmNsaWNrcyk7XG5cdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2N1cnJlbnRIaW50JywgdGhpcy5jdXJyZW50SGludCk7XG5cblx0XHR2YXIgcG9zO1xuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLmN1cnJlbnRIaW50OyBpKyspIHtcblx0XHRcdHBvcyA9IHRoaXMuY29uZmlnLmhpbnRzW2ldO1xuXHRcdFx0dGhpcy5oaW50cy5hZGRDaXJjbGUodGhpcy5nYW1lLmNlbnRlclgrcG9zLngsIHRoaXMuZ2FtZS5jZW50ZXJZK3Bvcy55LCAnaGludCcpO1xuXHRcdH1cblxuXHRcdHRoaXMuZ2FtZS5pbnRlcmZhY2Uuc2VsZWN0QnV0dG9ucyh7aGludDogdHJ1ZX0pXG5cdH1cblxuXHRuZXh0V2luZG93KCkge1xuXHRcdHZhciB3aW5kcyA9IHRoaXMuY29uZmlnLndpbmRvd3NbdGhpcy5nYW1lLnNldHRpbmdzLmxhbmddO1xuXHRcdGlmKCF3aW5kcyB8fCB0aGlzLmN1cnJlbnRXaW5kb3cgPiB3aW5kcy5sZW5ndGggLSAxKSByZXR1cm47XG5cblx0XHR0aGlzLmdhbWUud2luZG93TWFuYWdlci5hZGRXaW5kb3cod2luZHNbdGhpcy5jdXJyZW50V2luZG93XSwgKCkgPT4gdGhpcy5uZXh0V2luZG93KCkpO1xuXHRcdHRoaXMuY3VycmVudFdpbmRvdysrO1xuXHR9XG5cblx0Y2xvc2VQYXRoKCkge1xuXHRcdGlmKCF0aGlzLmlzTGV2ZWxDbG9zZVBhdGggJiYgdGhpcy51c2VyLmNpcmNsZXMubGVuZ3RoKSB7XG5cdFx0XHR0aGlzLmlzTGV2ZWxDbG9zZVBhdGggPSB0cnVlO1xuXHRcdFx0dGhpcy51c2VyUGF0aC5jbG9zZVBhdGgoKTtcblx0XHRcdHRoaXMuY2hlY2tMZXZlbE92ZXIoKTtcblx0XHR9XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBMZXZlbDsiLCJjbGFzcyBQYXRoTWFuYWdlciB7XG5cdGNvbnN0cnVjdG9yKGxldmVsKSB7XG5cdFx0dGhpcy5sZXZlbCA9IGxldmVsO1xuXHRcdHRoaXMuZ2FtZSA9IHRoaXMubGV2ZWwuZ2FtZTtcblx0XHR0aGlzLnBhdGggPSB0aGlzLmxldmVsLnN2Zy5wYXRoKCcnKTtcblx0XHR0aGlzLnBhdGguYXR0cih7XG5cdFx0XHRmaWxsOiAndHJhbnNwYXJlbnQnLFxuXHRcdFx0c3Ryb2tlOiAnI2ZmZicsXG5cdFx0XHRzdHJva2VXaWR0aDogM1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5wb2ludHMgPSBbXTtcblx0fVxuXHRhZGRQb2ludCh4LCB5KSB7XG5cdFx0dmFyIGQgPSB0aGlzLnBhdGguYXR0cignZCcpO1xuXHRcdHRoaXMucGF0aC5hdHRyKHtcblx0XHRcdGQ6IGAke2R9JHt0aGlzLnBvaW50cy5sZW5ndGggPyAnTCcgOiAnTSd9JHt4fSwke3l9YFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5wb2ludHMucHVzaCh7eCwgeX0pO1xuXHR9XG5cdGNsb3NlUGF0aCgpIHtcblx0XHR2YXIgZCA9IHRoaXMucGF0aC5hdHRyKCdkJyk7XG5cdFx0dGhpcy5wYXRoLmF0dHIoe1xuXHRcdFx0ZDogYCR7ZH0gWmBcblx0XHR9KTtcblxuXHRcdHRoaXMuYWRkUG9pbnQodGhpcy5wb2ludHNbMF0ueCwgdGhpcy5wb2ludHNbMF0ueSk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQYXRoTWFuYWdlcjsiLCJjbGFzcyBUb3VjaEFyZWEge1xuXHRjb25zdHJ1Y3RvcihtYW5hZ2VyLCB4LCB5LCB3LCBoKSB7XG5cdFx0dGhpcy5tYW5hZ2VyID0gbWFuYWdlcjtcblxuXHRcdHRoaXMucmVjdCA9IHRoaXMubWFuYWdlci5ncm91cC5yZWN0KHgsIHksIHcsIGgpO1xuXHRcdHRoaXMucmVjdC5hdHRyKHtcblx0XHRcdGZpbGw6ICd0cmFuc3BhcmVudCcsXG5cdFx0XHRzdHJva2U6ICcjZmZmJyxcblx0XHRcdHN0cm9rZVdpZHRoOiA1XG5cdFx0fSk7XG5cblx0XHR0aGlzLnR5cGUgPSAndG91Y2gnO1xuXHRcdHRoaXMueCA9IHggfHwgMDtcblx0XHR0aGlzLnkgPSB5IHx8IDA7XG5cdFx0dGhpcy53ID0gdyB8fCAwO1xuXHRcdHRoaXMuaCA9IGggfHwgMDtcblx0fVxuXHR0b3VjaEV2ZW50KCkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVG91Y2hBcmVhOyIsImNsYXNzIFVuY3Jvc3NDaXJjbGUge1xuXHRjb25zdHJ1Y3RvcihtYW5hZ2VyLCB4LCB5KSB7XG5cdFx0dGhpcy5tYW5hZ2VyID0gbWFuYWdlcjtcblx0XHRcblx0XHR0aGlzLmNpcmNsZSA9IHRoaXMubWFuYWdlci5ncm91cC5jaXJjbGUoeCwgeSwgMjUpO1xuXHRcdHRoaXMuY2lyY2xlLmF0dHIoe1xuXHRcdFx0cjogMjUsXG5cdFx0XHRmaWxsOiAncmdiYSgxMDMsIDU4LCAxODMpJyxcblx0XHRcdG9wYWNpdHk6IC42Myxcblx0XHRcdHN0cm9rZVdpZHRoOiAzXG5cdFx0fSk7XG5cblx0XHR0aGlzLnR5cGUgPSAndW5jcm9zcyc7XG5cdFx0dGhpcy54ID0geDtcblx0XHR0aGlzLnkgPSB5O1xuXHRcdHRoaXMuciA9IDI1O1xuXG5cdH1cblx0c3RhcnRDcm9zc0FuaW1hdGlvbigpIHtcblx0XHR0aGlzLmNpcmNsZS5hbmltYXRlKHtcblx0XHRcdHI6IDIwLFxuXHRcdFx0ZmlsbDogJyNmZmYnXG5cdFx0fSwgNTAwKTtcblx0fVxuXHRjcm9zc0V2ZW50KCkge1xuXHRcdHRoaXMubWFuYWdlci5sZXZlbC5pbnRlcnNlY3Rpb25zTGVmdCA9ICdYJztcblx0XHR0aGlzLm1hbmFnZXIubGV2ZWwuc3RlcHNMZWZ0ID0gMDtcdFxuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVW5jcm9zc0NpcmNsZTsiLCJjbGFzcyBVbnRvdWNoQXJlYSB7XG5cdGNvbnN0cnVjdG9yKG1hbmFnZXIsIHgsIHksIHcsIGgpIHtcblx0XHR0aGlzLm1hbmFnZXIgPSBtYW5hZ2VyO1xuXG5cdFx0dGhpcy5yZWN0ID0gdGhpcy5tYW5hZ2VyLmdyb3VwLnJlY3QoeCwgeSwgdywgaCk7XG5cdFx0dGhpcy5yZWN0LmF0dHIoe1xuXHRcdFx0ZmlsbDogJ3RyYW5zcGFyZW50Jyxcblx0XHRcdHN0cm9rZTogJyNGRjM1MzUnLFxuXHRcdFx0b3BhY2l0eTogMC44LFxuXHRcdFx0c3Ryb2tlV2lkdGg6IDVcblx0XHR9KTtcblxuXHRcdHRoaXMudHlwZSA9ICd1bnRvdWNoJztcblx0XHR0aGlzLnggPSB4IHx8IDA7XG5cdFx0dGhpcy55ID0geSB8fCAwO1xuXHRcdHRoaXMudyA9IHcgfHwgMDtcblx0XHR0aGlzLmggPSBoIHx8IDA7XG5cdH1cblx0dG91Y2hFdmVudCgpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBVbnRvdWNoQXJlYTsiLCJjbGFzcyBVc2VyQ2lyY2xlIHtcblx0Y29uc3RydWN0b3IobWFuYWdlciwgeCwgeSkge1xuXHRcdHRoaXMubWFuYWdlciA9IG1hbmFnZXI7XG5cdFx0XG5cdFx0dGhpcy5jaXJjbGUgPSB0aGlzLm1hbmFnZXIuZ3JvdXAuY2lyY2xlKHgsIHksIDApO1xuXHRcdHRoaXMuY2lyY2xlLmF0dHIoe1xuXHRcdFx0ZmlsbDogJyNmZmYnXG5cdFx0fSk7XG5cdFx0dGhpcy5jaXJjbGUuYW5pbWF0ZSh7XG5cdFx0XHRyOiAyMFxuXHRcdH0sIDEwMDAsIG1pbmEuZWxhc3RpYyk7XG5cblx0XHR0aGlzLnR5cGUgPSAndXNlcic7XG5cdFx0dGhpcy5yID0gMjA7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBVc2VyQ2lyY2xlOyIsIm1vZHVsZS5leHBvcnRzPVtcbiAge1xuICAgIFwibGFiZWxcIjogXCJFQVNZXCIsXG4gICAgXCJvYmplY3RzXCI6IFtcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IDAsXG4gICAgICAgIFwieVwiOiAwXG4gICAgICB9XG4gICAgXSxcbiAgICBcInN0ZXBzXCI6IDIsXG4gICAgXCJpbnRlcnNlY3Rpb25zXCI6IDEsXG4gICAgXCJidXR0b25zXCI6IFwiUlwiLFxuICAgIFwid2luZG93c1wiOiB7XG4gICAgICBcInJ1XCI6IFtcbiAgICAgICAge1xuICAgICAgICAgIFwibGFiZWxcIjogXCJMSU5FU1wiLFxuICAgICAgICAgIFwidGV4dFwiOiBcItCSINC20LjQstC+0L/QuNGB0LgsINC60LDQuiDQuCDQsiDQvNC+0YDQsNC70LgsINCz0LvQsNCy0L3QvtC1INGB0L7RgdGC0L7QuNGCINCyINGC0L7QvCwg0YfRgtC+0LHRiyDQsiDQvdGD0LbQvdC+0Lwg0LzQtdGB0YLQtSDQv9GA0L7QstC10YHRgtC4INC70LjQvdC40Y4g4oCUINCT0LjQu9Cx0LXRgNGCINCa0LjRgiDQp9C10YHRgtC10YDRgtC+0L1cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIklORk9cIixcbiAgICAgICAgICBcInRleHRcIjogXCLQp9GC0L7QsdGLINC/0LXRgNC10LfQsNCz0YDRg9C30LjRgtGMINC40LPRgNGDLCDQvdCw0LbQvNC40YLQtSBSXCJcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiZW5cIjogW1xuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwiQXJ0LCBsaWtlIG1vcmFsaXR5LCBjb25zaXN0cyBpbiBkcmF3aW5nIHRoZSBsaW5lIHNvbWV3aGVyZS4g4oCUIEdpbGJlcnQgS2VpdGggQ2hlc3RlcnRvblwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBcImxhYmVsXCI6IFwiSU5GT1wiLFxuICAgICAgICAgIFwidGV4dFwiOiBcIlRvIHJlc2V0IHRoZSBnYW1lLCBwcmVzcyBSXCJcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH1cbiAgfSxcbiAge1xuICAgIFwibGFiZWxcIjogXCJJIEFOR1VMVVNcIixcbiAgICBcIm9iamVjdHNcIjogW1xuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxuICAgICAgICBcInhcIjogLTc1LFxuICAgICAgICBcInlcIjogLTc1XG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxuICAgICAgICBcInhcIjogLTc1LFxuICAgICAgICBcInlcIjogNzVcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXG4gICAgICAgIFwieFwiOiA3NSxcbiAgICAgICAgXCJ5XCI6IC03NVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IDc1LFxuICAgICAgICBcInlcIjogNzVcbiAgICAgIH1cbiAgICBdLFxuICAgIFwic3RlcHNcIjogMyxcbiAgICBcImludGVyc2VjdGlvbnNcIjogNCxcbiAgICBcImJ1dHRvbnNcIjogXCJSXCIsXG4gICAgXCJ3aW5kb3dzXCI6IHtcbiAgICAgIFwicnVcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwi0JrQvtC90LXRhiDRg9C20LUg0YHQvtC00LXRgNC20LjRgtGB0Y8g0LIg0L3QsNGH0LDQu9C1LiDigJQg0JTQttC+0YDQtNC2INCe0YDRg9GN0LvQuy4gMTk4NFwiICAgICAgICAgIFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIklORk9cIixcbiAgICAgICAgICBcInRleHRcIjogXCLQndCw0LbQvNC40YLQtSDQvdCwIEgsINGH0YLQvtCx0Ysg0L/QvtC70YPRh9C40YLRjCDQv9C+0LTRgdC60LDQt9C60YMsINC60L7Qs9C00LAg0L7QvdCwINC/0L7Rj9Cy0LjRgtGB0Y9cIlxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJlblwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcbiAgICAgICAgICBcInRleHRcIjogXCJUaGUgZW5kIGlzIGFscmVhZHkgY29udGFpbmVkIGluIHRoZSBiZWdpbm5pbmcuIC0gR2VvcmdlIE9yd2VsbC4gMTk4NFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBcImxhYmVsXCI6IFwiSU5GT1wiLFxuICAgICAgICAgIFwidGV4dFwiOiBcIlByZXNzIEgsIHRvIGdldCBhIGNsdWUgd2hlbiBpdCBhcHBlYXJzXCJcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0sXG4gICAgXCJjbGlja3NcIjogMTgsXG4gICAgXCJoaW50c1wiOiBbXG4gICAgICB7XCJ4XCI6IDI1MCwgXCJ5XCI6IC0xMjV9LFxuICAgICAge1wieFwiOiAtMzUwLCBcInlcIjogMH0sXG4gICAgICB7XCJ4XCI6IDI1MCwgXCJ5XCI6IDEyNX1cbiAgICBdXG4gIH0sXG4gIHtcbiAgICBcImxhYmVsXCI6IFwiViBhbmQgSVhcIixcbiAgICBcImludGVyc2VjdGlvbnNcIjogOSxcbiAgICBcInN0ZXBzXCI6IDQsXG4gICAgXCJjbGlja3NcIjogNTAsXG4gICAgXCJvYmplY3RzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDk1LFxuICAgICAgICAgICAgXCJ5XCI6IDk1LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMCxcbiAgICAgICAgICAgIFwieVwiOiA5NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC05NSxcbiAgICAgICAgICAgIFwieVwiOiA5NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC05NSxcbiAgICAgICAgICAgIFwieVwiOiAwLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMCxcbiAgICAgICAgICAgIFwieVwiOiAwLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogOTUsXG4gICAgICAgICAgICBcInlcIjogMCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDk1LFxuICAgICAgICAgICAgXCJ5XCI6IC05NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDAsXG4gICAgICAgICAgICBcInlcIjogLTk1LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTk1LFxuICAgICAgICAgICAgXCJ5XCI6IC05NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJoaW50c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMjY4LjUsXG4gICAgICAgICAgICBcInlcIjogMTQxLjVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDMzMS41LFxuICAgICAgICAgICAgXCJ5XCI6IDQxLjVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0yNjguNSxcbiAgICAgICAgICAgIFwieVwiOiAtNTguNVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMzMxLjUsXG4gICAgICAgICAgICBcInlcIjogLTE1OC41XG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiYnV0dG9uc1wiOiBcIlJcIixcbiAgICBcImFyZWFzXCI6IG51bGwsXG4gICAgXCJoaW50UlVcIjogbnVsbCxcbiAgICBcImhpbnRVU1wiOiBudWxsXG4gIH0sXG4gIHtcbiAgICBcImxhYmVsXCI6IFwiSUlJIElOIEEgUk9XXCIsXG4gICAgXCJvYmplY3RzXCI6IFtcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IC01MCxcbiAgICAgICAgXCJ5XCI6IC01MFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IDAsXG4gICAgICAgIFwieVwiOiAtNTBcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXG4gICAgICAgIFwieFwiOiA1MCxcbiAgICAgICAgXCJ5XCI6IC01MFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IC01MCxcbiAgICAgICAgXCJ5XCI6IDBcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXG4gICAgICAgIFwieFwiOiAwLFxuICAgICAgICBcInlcIjogMFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IDUwLFxuICAgICAgICBcInlcIjogMFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IC01MCxcbiAgICAgICAgXCJ5XCI6IDUwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxuICAgICAgICBcInhcIjogMCxcbiAgICAgICAgXCJ5XCI6IDUwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxuICAgICAgICBcInhcIjogNTAsXG4gICAgICAgIFwieVwiOiA1MFxuICAgICAgfSxcbiAgICBdLFxuICAgIFwic3RlcHNcIjogMixcbiAgICBcImludGVyc2VjdGlvbnNcIjogNSxcbiAgICBcImJ1dHRvbnNcIjogXCJSXCIsXG4gICAgXCJ3aW5kb3dzXCI6IHtcbiAgICAgIFwiZW5cIjogW1xuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwiRG8gbm90IGxvc2Ugbm90IG9uZSB3aG8ga25vd3MgYWxsIHRoZSBvcHRpb25zIG9mIHZpY3RvcnksIGJ1dCB0aGUgb25lIHdobyBrbm93cyBhbGwgdGhlIG9wdGlvbnMgZGVmZWF0LiDigJQgSGFyb3VuIEFnYXRzYXJza3lcIlxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJydVwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcbiAgICAgICAgICBcInRleHRcIjogXCLQndC1INC/0YDQvtC40LPRgNGL0LLQsNC10YIg0L3QtSDRgtC+0YIsINC60YLQviDQt9C90LDQtdGCINCy0YHQtSDQstCw0YDQuNCw0L3RgtGLINC/0L7QsdC10LTRiywg0LAg0YLQvtGCLCDQutGC0L4g0LfQvdCw0LXRgiDQstGB0LUg0LLQsNGA0LjQsNC90YLRiyDQv9C+0YDQsNC20LXQvdC40Y8uIOKAlCDQk9Cw0YDRg9C9INCQ0LPQsNGG0LDRgNGB0LrQuNC5XCJcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0sXG4gICAgXCJjbGlja3NcIjogMjIsXG4gICAgXCJoaW50c1wiOiBbXG4gICAgICB7XCJ4XCI6IC0xMDAsIFwieVwiOiAxMDB9LFxuICAgICAge1wieFwiOiA2MCwgXCJ5XCI6IC0xMDB9XG4gICAgXVxuICB9LFxuICB7XG4gICAgXCJsYWJlbFwiOiBcIkNPTklVTkNUSVNcIixcbiAgICBcImludGVyc2VjdGlvbnNcIjogNCxcbiAgICBcInN0ZXBzXCI6IDMsXG4gICAgXCJjbGlja3NcIjogNTAsXG4gICAgXCJvYmplY3RzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0yMzAsXG4gICAgICAgICAgICBcInlcIjogLTgwLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMjIwLFxuICAgICAgICAgICAgXCJ5XCI6IC04MCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDI3MCxcbiAgICAgICAgICAgIFwieVwiOiAyMCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0yODAsXG4gICAgICAgICAgICBcInlcIjogMjAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiaGludHNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTUsXG4gICAgICAgICAgICBcInlcIjogLTMwXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMTMwLFxuICAgICAgICAgICAgXCJ5XCI6IC01XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAxMjAsXG4gICAgICAgICAgICBcInlcIjogLTVcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJhcmVhc1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMTg5LFxuICAgICAgICAgICAgXCJ5XCI6IC0xMTksXG4gICAgICAgICAgICBcIndcIjogMzY4LFxuICAgICAgICAgICAgXCJoXCI6IDIwOCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInRvdWNoXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJidXR0b25zXCI6IFwiUlwiLFxuICAgIFwid2luZG93c1wiOiB7XG4gICAgICBcInJ1XCI6IFtcbiAgICAgICAge1xuICAgICAgICAgIFwibGFiZWxcIjogXCJMSU5FU1wiLFxuICAgICAgICAgIFwidGV4dFwiOiBcItCV0YHQu9C4INCx0Ysg0L7RgtGA0LXQt9C+0Log0L3QtSDRgdGH0LjRgtCw0Lsg0YHQtdCx0Y8g0LHQtdGB0LrQvtC90LXRh9C90L7QuSDQv9GA0Y/QvNC+0LksINC+0L0g0LLRgNGP0LQg0LvQuCDQsdGLINC00L7RgtGP0L3Rg9C7INC+0YIg0L7QtNC90L7QuSDQtNC+INC00YDRg9Cz0L7QuSDRgtC+0YfQutC4IOKAlCDQpNC10LvQuNC60YEg0JrRgNC40LLQuNC9XCJcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiZW5cIjogW1xuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwiSWYgdGhlIGxpbmUgc2VnbWVudCBpcyBub3QgY29uc2lkZXJlZCBoaW1zZWxmIGFuIGluZmluaXRlIHN0cmFpZ2h0IGxpbmUsIGhlIGlzIHVubGlrZWx5IHRvIHJlYWNoIGZyb20gb25lIHRvIGFub3RoZXIgcG9pbnQg4oCUIEZlbGl4IEtyaXZpbmVcIlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfVxuICB9LFxuICB7XG4gICAgXCJsYWJlbFwiOiBcIlJBVFNcIixcbiAgICBcImludGVyc2VjdGlvbnNcIjogOCxcbiAgICBcInN0ZXBzXCI6IDUsXG4gICAgXCJvYmplY3RzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0yMzAsXG4gICAgICAgICAgICBcInlcIjogLTMwLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMjIwLFxuICAgICAgICAgICAgXCJ5XCI6IC0zMCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0zMCxcbiAgICAgICAgICAgIFwieVwiOiAtMjMwLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMjAsXG4gICAgICAgICAgICBcInlcIjogLTIzMCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0xMDAsXG4gICAgICAgICAgICBcInlcIjogMjYwLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMTAwLFxuICAgICAgICAgICAgXCJ5XCI6IDI2MCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0xMzUsXG4gICAgICAgICAgICBcInlcIjogMjI1LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMTM1LFxuICAgICAgICAgICAgXCJ5XCI6IDIyNSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJjbGlja3NcIjogNTAsXG4gICAgXCJoaW50c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAxNDUsXG4gICAgICAgICAgICBcInlcIjogMjBcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC04MCxcbiAgICAgICAgICAgIFwieVwiOiAxNzBcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC01LFxuICAgICAgICAgICAgXCJ5XCI6IC0xODBcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDcwLFxuICAgICAgICAgICAgXCJ5XCI6IDE3MFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTE1NSxcbiAgICAgICAgICAgIFwieVwiOiAyMFxuICAgICAgICB9XG4gICAgXSxcbiAgICBcImFyZWFzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0xNzUsXG4gICAgICAgICAgICBcInlcIjogLTE3NSxcbiAgICAgICAgICAgIFwid1wiOiAzNTAsXG4gICAgICAgICAgICBcImhcIjogMzUwLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidG91Y2hcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcImJ1dHRvbnNcIjogXCJSXCIsXG4gICAgXCJ3aW5kb3dzXCI6IHtcbiAgICAgIFwicnVcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwi0J3QsNGH0LjQvdCw0Y8g0YEg0L7Qv9GA0LXQtNC10LvQtdC90L3QvtC5INGC0L7Rh9C60LgsINCy0L7Qt9Cy0YDQsNGCINGD0LbQtSDQvdC10LLQvtC30LzQvtC20LXQvS4g0K3RgtC+0Lkg0YLQvtGH0LrQuCDQvdCw0LTQviDQtNC+0YHRgtC40YfRjC4g4oCUINCk0YDQsNC90YYg0JrQsNGE0LrQsFwiXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcImVuXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgIFwibGFiZWxcIjogXCJMSU5FU1wiLFxuICAgICAgICAgIFwidGV4dFwiOiBcIlRoZXJlIGlzIGEgcG9pbnQgb2Ygbm8gcmV0dXJuLiBUaGlzIHBvaW50IGhhcyB0byBiZSByZWFjaGVkLiDigJQgRnJhbnogS2Fma2FcIlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfVxuICB9LFxuICB7XG4gICAgXCJsYWJlbFwiOiBcIlRSSUdPTlVTXCIsXG4gICAgXCJjbGlja3NcIjogNTAsXG4gICAgXCJvYmplY3RzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0xODAsXG4gICAgICAgICAgICBcInlcIjogLTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMTMwLFxuICAgICAgICAgICAgXCJ5XCI6IC01NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDE3MCxcbiAgICAgICAgICAgIFwieVwiOiA0NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDcwLFxuICAgICAgICAgICAgXCJ5XCI6IC01NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDEyMCxcbiAgICAgICAgICAgIFwieVwiOiA5NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC04MCxcbiAgICAgICAgICAgIFwieVwiOiA5NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJoaW50c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMjgwLFxuICAgICAgICAgICAgXCJ5XCI6IDk1XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMzAsXG4gICAgICAgICAgICBcInlcIjogLTE1NVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMjIwLFxuICAgICAgICAgICAgXCJ5XCI6IDk1XG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwic3RlcHNcIjogMyxcbiAgICBcImludGVyc2VjdGlvbnNcIjogNixcbiAgICBcImFyZWFzXCI6IFtcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC0zMDAsXG4gICAgICAgIFwid1wiOiA2MDAsXG4gICAgICAgIFwieVwiOiAtMTYwLFxuICAgICAgICBcImhcIjogMzQwLFxuICAgICAgICBcInR5cGVcIjogXCJ0b3VjaFwiXG4gICAgICB9XG4gICAgXSxcbiAgICBcImJ1dHRvbnNcIjogXCJSIFpcIixcbiAgICBcIndpbmRvd3NcIjoge1xuICAgICAgXCJydVwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcbiAgICAgICAgICBcInRleHRcIjogXCLQmtC+0LPQtNCwINC/0L7RgNCwINCy0L7Qt9Cy0YDQsNGJ0LDRgtGM0YHRjywg0YHRg9C00YzQsdCwINC90LDQudC00LXRgiDRgdC/0L7RgdC+0LEg0YLQtdCx0Y8g0LLQtdGA0L3Rg9GC0YwuIOKAlCDQodCw0YDQsCDQlNC20LjQvi4g0KTQuNCw0LvQutC4INCyINC80LDRgNGC0LVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIklORk9cIixcbiAgICAgICAgICBcInRleHRcIjogXCLQp9GC0L7QsdGLINC30LDQvNC60L3Rg9GC0Ywg0YLQvtGH0LrQuCDQu9C40L3QuNC10LksINC90LDQttC80LjRgtC1IFpcIlxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJlblwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcbiAgICAgICAgICBcInRleHRcIjogXCJGYXRlIGhhcyBhIHdheSBvZiBicmluZ2luZyB5b3UgYmFjayB3aGVuIGl0J3MgdGltZSB0byBjb21lIGJhY2sg4oCUIFNhcmFoIEppby4gVGhlIFZpb2xldHMgb2YgTWFyY2hcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIklORk9cIixcbiAgICAgICAgICBcInRleHRcIjogXCJUbyBjbG9zZSB0aGUgbGluZSBwb2ludHMsIHByZXNzIFpcIlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfVxuICB9LFxuICB7XG4gICAgXCJsYWJlbFwiOiBcIkJFQVJcIixcbiAgICBcInN0ZXBzXCI6IDMsXG4gICAgXCJpbnRlcnNlY3Rpb25zXCI6IDYsXG4gICAgXCJjbGlja3NcIjogNTAsXG4gICAgXCJidXR0b25zXCI6IFwiUiBaXCIsXG4gICAgXCJvYmplY3RzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0xMzAsXG4gICAgICAgICAgICBcInlcIjogNzAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiA0NSxcbiAgICAgICAgICAgIFwieVwiOiA0NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDI0NSxcbiAgICAgICAgICAgIFwieVwiOiAxOTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAyOTUsXG4gICAgICAgICAgICBcInlcIjogNzAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMzA1LFxuICAgICAgICAgICAgXCJ5XCI6IC01NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDcwLFxuICAgICAgICAgICAgXCJ5XCI6IDE3MCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJoaW50c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAyNDUsXG4gICAgICAgICAgICBcInlcIjogMjIwXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMzMwLFxuICAgICAgICAgICAgXCJ5XCI6IC0zMFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogNzAsXG4gICAgICAgICAgICBcInlcIjogNDVcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJhcmVhc1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMzM5LFxuICAgICAgICAgICAgXCJ5XCI6IC05MSxcbiAgICAgICAgICAgIFwid1wiOiA2OSxcbiAgICAgICAgICAgIFwiaFwiOiA3MCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInRvdWNoXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDEwLFxuICAgICAgICAgICAgXCJ5XCI6IDExLFxuICAgICAgICAgICAgXCJ3XCI6IDcxLFxuICAgICAgICAgICAgXCJoXCI6IDY4LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidG91Y2hcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMjEyLFxuICAgICAgICAgICAgXCJ5XCI6IDE2MyxcbiAgICAgICAgICAgIFwid1wiOiA2NyxcbiAgICAgICAgICAgIFwiaFwiOiA2NixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInRvdWNoXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJoaW50UlVcIjogbnVsbCxcbiAgICBcImhpbnRVU1wiOiBudWxsLFxuICAgIFwibmV3XCI6IHRydWVcbiAgfSxcbiAge1xuICAgIFwibGFiZWxcIjogXCJCQUNLV0FSRFNcIixcbiAgICBcImNsaWNrc1wiOiA1MCxcbiAgICBcImhpbnRzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC04MCxcbiAgICAgICAgICAgIFwieVwiOiA3MFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTUsXG4gICAgICAgICAgICBcInlcIjogLTE1NVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogOTUsXG4gICAgICAgICAgICBcInlcIjogLTE1NVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogNDUsXG4gICAgICAgICAgICBcInlcIjogMTIwXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwib2JqZWN0c1wiOiBbXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXG4gICAgICAgIFwieFwiOiAtNTAsXG4gICAgICAgIFwieVwiOiAwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxuICAgICAgICBcInhcIjogMTAwLFxuICAgICAgICBcInlcIjogLTEwMFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IDUwLFxuICAgICAgICBcInlcIjogNTBcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXG4gICAgICAgIFwieFwiOiA1MCxcbiAgICAgICAgXCJ5XCI6IDI1MFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IC0xNTAsXG4gICAgICAgIFwieVwiOiAyNTBcbiAgICAgIH1cbiAgICBdLFxuICAgIFwiYXJlYXNcIjogW1xuICAgICAge1xuICAgICAgICBcInhcIjogLTEyNSxcbiAgICAgICAgXCJ3XCI6IDMyNSxcbiAgICAgICAgXCJ5XCI6IC0xNjAsXG4gICAgICAgIFwiaFwiOiAzMDAsXG4gICAgICAgIFwidHlwZVwiOiBcInRvdWNoXCJcbiAgICAgIH1cbiAgICBdLFxuICAgIFwic3RlcHNcIjogNCxcbiAgICBcImludGVyc2VjdGlvbnNcIjogNSxcbiAgICBcImJ1dHRvbnNcIjogXCJSIFpcIixcbiAgICBcIndpbmRvd3NcIjoge1xuICAgICAgXCJydVwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcbiAgICAgICAgICBcInRleHRcIjogXCLQnNGLINC90LUg0L7RgtGB0YLRg9C/0LDQtdC8IOKAlCDQvNGLINC40LTQtdC8INCyINC00YDRg9Cz0L7QvCDQvdCw0L/RgNCw0LLQu9C10L3QuNC4LiDigJQg0JTRg9Cz0LvQsNGBINCc0LDQutCw0YDRgtGD0YBcIlxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJlblwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcbiAgICAgICAgICBcInRleHRcIjogXCJXZSBhcmUgbm90IHJldHJlYXRpbmcgLSB3ZSBhcmUgZ29pbmcgaW4gdGhlIG90aGVyIGRpcmVjdGlvbiDigJQgRG91Z2xhcyBNYWNBcnRodXJcIlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfVxuICB9LFxuICB7XG4gICAgXCJsYWJlbFwiOiBcIk1BTFVNXCIsXG4gICAgXCJjbGlja3NcIjogNSxcbiAgICBcIm9iamVjdHNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTUsXG4gICAgICAgICAgICBcInlcIjogLTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiA0NSxcbiAgICAgICAgICAgIFwieVwiOiAtNSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTU1LFxuICAgICAgICAgICAgXCJ5XCI6IC01LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtNSxcbiAgICAgICAgICAgIFwieVwiOiAtNTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC01LFxuICAgICAgICAgICAgXCJ5XCI6IDQ1LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiaGludHNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTU1LFxuICAgICAgICAgICAgXCJ5XCI6IDQ1XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiA0NSxcbiAgICAgICAgICAgIFwieVwiOiAtNTVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC01NSxcbiAgICAgICAgICAgIFwieVwiOiAtNTVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDQ1LFxuICAgICAgICAgICAgXCJ5XCI6IDQ1XG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwic3RlcHNcIjogMixcbiAgICBcImludGVyc2VjdGlvbnNcIjogMSxcbiAgICBcImJ1dHRvbnNcIjogXCJSIFpcIixcbiAgICBcIndpbmRvd3NcIjoge1xuICAgICAgXCJydVwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcbiAgICAgICAgICBcInRleHRcIjogXCLQnNGLINC30LDQvNC10YfQsNC10Lwg0L/RgNC10L/Rj9GC0YHRgtCy0LjRjywg0LrQvtCz0LTQsCDQvtGC0YDRi9Cy0LDQtdC8INCy0LfQs9C70Y/QtCDQvtGCINGG0LXQu9C4LiDigJQg0JTQttC+0LfQtdGEINCa0L7RgdGB0LzQsNC9XCJcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiZW5cIjogW1xuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwiV2Ugbm90aWNlIHRoZSBvYnN0YWNsZXMsIHdoZW4gd2UgZG8gbm90IGxvb2sgYXQgdGhlIGdvYWwuIOKAlCBKb3NlcGggS29zc21hblwiXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9XG4gIH0sXG4gIHtcbiAgICBcImxhYmVsXCI6IFwiSUlJXCIsXG4gICAgXCJjbGlja3NcIjogMzAsXG4gICAgXCJvYmplY3RzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0xNTUsXG4gICAgICAgICAgICBcInlcIjogNDUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtODAsXG4gICAgICAgICAgICBcInlcIjogLTMwLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTUsXG4gICAgICAgICAgICBcInlcIjogLTEwNSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDcwLFxuICAgICAgICAgICAgXCJ5XCI6IC0zMCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDE0NSxcbiAgICAgICAgICAgIFwieVwiOiA0NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC01LFxuICAgICAgICAgICAgXCJ5XCI6IDE3MCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC01LFxuICAgICAgICAgICAgXCJ5XCI6IC0zMCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogNzAsXG4gICAgICAgICAgICBcInlcIjogOTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC04MCxcbiAgICAgICAgICAgIFwieVwiOiA5NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTUsXG4gICAgICAgICAgICBcInlcIjogNDUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDcwLFxuICAgICAgICAgICAgXCJ5XCI6IC0xNTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC04MCxcbiAgICAgICAgICAgIFwieVwiOiAtMTU1LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiaGludHNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTI1NSxcbiAgICAgICAgICAgIFwieVwiOiAxNzBcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDIwLFxuICAgICAgICAgICAgXCJ5XCI6IC0xODBcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDE5NSxcbiAgICAgICAgICAgIFwieVwiOiAxNzBcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJzdGVwc1wiOiAzLFxuICAgIFwiaW50ZXJzZWN0aW9uc1wiOiA2LFxuICAgIFwiYnV0dG9uc1wiOiBcIlJaXCIsXG4gICAgXCJhcmVhc1wiOiBudWxsXG4gIH0sXG4gIHtcbiAgICBcImxhYmVsXCI6IFwiRUFaWT9cIixcbiAgICBcIm9iamVjdHNcIjogW1xuICAgICAge1xuICAgICAgICBcInhcIjogLTQzLFxuICAgICAgICBcInlcIjogLTQ4LFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogLTQyLFxuICAgICAgICBcInlcIjogLTgsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAtNDEsXG4gICAgICAgIFwieVwiOiAyOSxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC00MCxcbiAgICAgICAgXCJ5XCI6IDcwLFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogLTM5LFxuICAgICAgICBcInlcIjogMTEyLFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogLTQ0LFxuICAgICAgICBcInlcIjogLTgzLFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogLTE5LFxuICAgICAgICBcInlcIjogLTM4LFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogLTIsXG4gICAgICAgIFwieVwiOiAtNyxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDE4LFxuICAgICAgICBcInlcIjogMjMsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiA0MCxcbiAgICAgICAgXCJ5XCI6IDUxLFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogNTcsXG4gICAgICAgIFwieVwiOiA4NixcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDc4LFxuICAgICAgICBcInlcIjogMTE0LFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogODQsXG4gICAgICAgIFwieVwiOiA4MCxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDg2LFxuICAgICAgICBcInlcIjogNDksXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiA4NyxcbiAgICAgICAgXCJ5XCI6IDIwLFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogODcsXG4gICAgICAgIFwieVwiOiAtMTMsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiA4NyxcbiAgICAgICAgXCJ5XCI6IC00NyxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDEzOSxcbiAgICAgICAgXCJ5XCI6IC04NCxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDE3NCxcbiAgICAgICAgXCJ5XCI6IC04NSxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDIyMCxcbiAgICAgICAgXCJ5XCI6IC04NSxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDEyNSxcbiAgICAgICAgXCJ5XCI6IDIsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAxNjAsXG4gICAgICAgIFwieVwiOiA1LFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogMTk4LFxuICAgICAgICBcInlcIjogNyxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDIyNyxcbiAgICAgICAgXCJ5XCI6IDcsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAxMTUsXG4gICAgICAgIFwieVwiOiAxMDgsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAxNTYsXG4gICAgICAgIFwieVwiOiAxMTIsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAyMDEsXG4gICAgICAgIFwieVwiOiAxMTAsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAyMzQsXG4gICAgICAgIFwieVwiOiAxMTMsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiA5MixcbiAgICAgICAgXCJ5XCI6IC04NSxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDM5NCxcbiAgICAgICAgXCJ5XCI6IC01MixcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDM2NCxcbiAgICAgICAgXCJ5XCI6IC03NixcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDMyMCxcbiAgICAgICAgXCJ5XCI6IC02NSxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDMwNSxcbiAgICAgICAgXCJ5XCI6IC0yMixcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDMyNSxcbiAgICAgICAgXCJ5XCI6IDEzLFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogMzY5LFxuICAgICAgICBcInlcIjogMzUsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAzOTAsXG4gICAgICAgIFwieVwiOiA3MyxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDM3MSxcbiAgICAgICAgXCJ5XCI6IDExNixcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDMyOSxcbiAgICAgICAgXCJ5XCI6IDEzMSxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDI5OCxcbiAgICAgICAgXCJ5XCI6IDEyMyxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC0yNTcsXG4gICAgICAgIFwieVwiOiAtOTAsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAtMjU3LFxuICAgICAgICBcInlcIjogLTU0LFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogLTI1OCxcbiAgICAgICAgXCJ5XCI6IC0xMyxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC0yNTcsXG4gICAgICAgIFwieVwiOiAyNCxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC0yNTksXG4gICAgICAgIFwieVwiOiA1NSxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC0yNjAsXG4gICAgICAgIFwieVwiOiAxMDIsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAtMjE0LFxuICAgICAgICBcInlcIjogMTA0LFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogLTE3MyxcbiAgICAgICAgXCJ5XCI6IDEwNSxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC0xMjgsXG4gICAgICAgIFwieVwiOiA3MixcbiAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogLTEyOCxcbiAgICAgICAgXCJ5XCI6IDQxLFxuICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAtMTI3LFxuICAgICAgICBcInlcIjogMTIsXG4gICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC0xMjUsXG4gICAgICAgIFwieVwiOiAtMjEsXG4gICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC0xMjQsXG4gICAgICAgIFwieVwiOiAtNTYsXG4gICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC0xMjMsXG4gICAgICAgIFwieVwiOiAtOTEsXG4gICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC0xMzEsXG4gICAgICAgIFwieVwiOiAxMTEsXG4gICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgfVxuICAgIF0sXG4gICAgXCJjbGlja3NcIjogNTAsXG4gICAgXCJoaW50c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiA5NSxcbiAgICAgICAgICAgIFwieVwiOiAxNDVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDEyMCxcbiAgICAgICAgICAgIFwieVwiOiAtMTA1XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMTgwLFxuICAgICAgICAgICAgXCJ5XCI6IC0yMzBcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJzdGVwc1wiOiAzLFxuICAgIFwiaW50ZXJzZWN0aW9uc1wiOiAyMCxcbiAgICBcImJ1dHRvbnNcIjogXCJSWlwiLFxuICAgIFwiYXJlYXNcIjogbnVsbCxcbiAgICBcImhpbnRSVVwiOiBudWxsLFxuICAgIFwiaGludFVTXCI6IG51bGwsXG4gICAgXCJuZXdcIjogdHJ1ZVxuICB9LFxuICB7XG4gICAgXCJsYWJlbFwiOiBcIkNIQU9TXCIsXG4gICAgXCJjbGlja3NcIjogNTAsXG4gICAgXCJvYmplY3RzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0yMDUsXG4gICAgICAgICAgICBcInlcIjogLTE1NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDk1LFxuICAgICAgICAgICAgXCJ5XCI6IDIwLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMTQ1LFxuICAgICAgICAgICAgXCJ5XCI6IC04MCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDIyMCxcbiAgICAgICAgICAgIFwieVwiOiAtMTU1LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTMwLFxuICAgICAgICAgICAgXCJ5XCI6IDQ1LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTMwLFxuICAgICAgICAgICAgXCJ5XCI6IC0xMzAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMTMwLFxuICAgICAgICAgICAgXCJ5XCI6IC0xNTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMjM5LFxuICAgICAgICAgICAgXCJ5XCI6IDk4LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMTk1LFxuICAgICAgICAgICAgXCJ5XCI6IDk1LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAxMjAsXG4gICAgICAgICAgICBcInlcIjogMTQ1LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMjgwLFxuICAgICAgICAgICAgXCJ5XCI6IDIwLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMjA1LFxuICAgICAgICAgICAgXCJ5XCI6IDE3MCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTEzMCxcbiAgICAgICAgICAgIFwieVwiOiAxOTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0yODAsXG4gICAgICAgICAgICBcInlcIjogMTk1LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMzA0LFxuICAgICAgICAgICAgXCJ5XCI6IDc4LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMTA1LFxuICAgICAgICAgICAgXCJ5XCI6IDEyMCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogOTUsXG4gICAgICAgICAgICBcInlcIjogLTE1NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMTcwLFxuICAgICAgICAgICAgXCJ5XCI6IC0yMzAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDIwLFxuICAgICAgICAgICAgXCJ5XCI6IC0yMzAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0xMDUsXG4gICAgICAgICAgICBcInlcIjogLTMwLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMjMwLFxuICAgICAgICAgICAgXCJ5XCI6IC04MCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0yMzAsXG4gICAgICAgICAgICBcInlcIjogMjAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDI0NSxcbiAgICAgICAgICAgIFwieVwiOiAtNTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC01LFxuICAgICAgICAgICAgXCJ5XCI6IDI3MCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcImhpbnRzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0zMDUsXG4gICAgICAgICAgICBcInlcIjogMTIwXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAxOTUsXG4gICAgICAgICAgICBcInlcIjogLTVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0zMzAsXG4gICAgICAgICAgICBcInlcIjogLTIwNVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTEwNSxcbiAgICAgICAgICAgIFwieVwiOiA0NVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMjk1LFxuICAgICAgICAgICAgXCJ5XCI6IC0yMDVcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJzdGVwc1wiOiA1LFxuICAgIFwiaW50ZXJzZWN0aW9uc1wiOiA5LFxuICAgIFwiYnV0dG9uc1wiOiBcIlJaXCIsXG4gICAgXCJhcmVhc1wiOiBudWxsLFxuICAgIFwid2luZG93c1wiOiB7XG4gICAgICBcInJ1XCI6IFtcbiAgICAgICAge1xuICAgICAgICAgIFwibGFiZWxcIjogXCJMSU5FU1wiLFxuICAgICAgICAgIFwidGV4dFwiOiBcItCW0LjQt9C90Ywg4oCUINGN0YLQviDQv9GA0LXQttC00LUg0LLRgdC10LPQviDRhdCw0L7RgSwg0LIg0LrQvtGC0L7RgNC+0Lwg0YLRiyDQt9Cw0YLQtdGA0Y/QvS4g0KXQvtGB0LUg0J7RgNGC0LXQs9CwLdC4LdCT0LDRgdGB0LXRglwiXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcImVuXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgIFwibGFiZWxcIjogXCJMSU5FU1wiLFxuICAgICAgICAgIFwidGV4dFwiOiBcIkxpZmUgLSBpcyBmaXJzdCBvZiBhbGwgdGhlIGNoYW9zLCBpbiB3aGljaCB5b3UgbG9zdC4gSm9z0LUgT3J0ZWdhIHkgR2Fzc2V0XCJcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICB9XG4gIH0sXG4gIHtcbiAgICBcImxhYmVsXCI6IFwiSU1QRURJTUVOVEFcIixcbiAgICBcIm9iamVjdHNcIjogW1xuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxuICAgICAgICBcInhcIjogLTkwLFxuICAgICAgICBcInlcIjogLTcwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxuICAgICAgICBcInhcIjogOTAsXG4gICAgICAgIFwieVwiOiAtNzBcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IDU1LFxuICAgICAgICBcInlcIjogLTMwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCIsXG4gICAgICAgIFwieFwiOiAtNTUsXG4gICAgICAgIFwieVwiOiAtMzBcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXG4gICAgICAgIFwieFwiOiA1NSxcbiAgICAgICAgXCJ5XCI6IDMwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxuICAgICAgICBcInhcIjogLTU1LFxuICAgICAgICBcInlcIjogMzBcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXG4gICAgICAgIFwieFwiOiA5MCxcbiAgICAgICAgXCJ5XCI6IDcwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxuICAgICAgICBcInhcIjogLTkwLFxuICAgICAgICBcInlcIjogNzBcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IC0xNzUsXG4gICAgICAgIFwieVwiOiA0MFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiLFxuICAgICAgICBcInhcIjogMTc1LFxuICAgICAgICBcInlcIjogNDBcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IDU1LFxuICAgICAgICBcInlcIjogMjAwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCIsXG4gICAgICAgIFwieFwiOiAtNTUsXG4gICAgICAgIFwieVwiOiAyMDBcbiAgICAgIH1cbiAgICBdLFxuICAgIFwiY2xpY2tzXCI6IDUwLFxuICAgIFwiaGludHNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTIzMCxcbiAgICAgICAgICAgIFwieVwiOiAtODBcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0yMDUsXG4gICAgICAgICAgICBcInlcIjogOTVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDIyMCxcbiAgICAgICAgICAgIFwieVwiOiA5NVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMjQ1LFxuICAgICAgICAgICAgXCJ5XCI6IC04MFxuICAgICAgICB9XG4gICAgXSxcbiAgICBcInN0ZXBzXCI6IDQsXG4gICAgXCJpbnRlcnNlY3Rpb25zXCI6IDYsXG4gICAgXCJidXR0b25zXCI6IFwiUiBaXCIsXG5cbiAgICBcIndpbmRvd3NcIjoge1xuICAgICAgXCJydVwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcbiAgICAgICAgICBcInRleHRcIjogXCLQndC1INGC0YDQsNGC0YzRgtC1INCy0YDQtdC80Y8g0LIg0L/QvtC40YHQutC1INC/0YDQtdC/0Y/RgtGB0YLQstC40Lk6INC40YUg0LzQvtC20LXRgiDQuCDQvdC1INGB0YPRidC10YHRgtCy0L7QstCw0YLRjC4g4oCUINCk0YDQsNC90YYg0JrQsNGE0LrQsFwiXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcImVuXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgIFwibGFiZWxcIjogXCJMSU5FU1wiLFxuICAgICAgICAgIFwidGV4dFwiOiBcIkRvIG5vdCB3YXN0ZSB5b3VyIHRpbWUgc2VhcmNoaW5nIGZvciBvYnN0YWNsZXM6IHRoZXkgbWF5IGRvZXMgbm90IGV4aXN0LiDigJQgRnJhbnogS2Fma2FcIlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfVxuICB9XG5dIiwiY2xhc3MgQWpheFJlcXVlc3RzIHtcblx0Y29uc3RydWN0b3IoZ2FtZSwgcmVwb3NpdG9yeSkge1xuXHRcdHRoaXMuZ2FtZSA9IGdhbWU7XG5cdFx0dGhpcy5yZXBvc2l0b3J5ID0gcmVwb3NpdG9yeTtcblxuXHRcdHRoaXMudHJhbnNsYXRlcyA9IHtcblx0XHRcdGFzazoge1xuXHRcdFx0XHRydToge1xuXHRcdFx0XHRcdGxhYmVsOiAnSU5GTycsXG5cdFx0XHRcdFx0dGV4dDogJ9CX0LDQs9GA0YPQt9C40YLRjCDQvdC+0LLRi9C1INGD0YDQvtCy0L3QuD8nXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGVuOiB7XG5cdFx0XHRcdFx0bGFiZWw6ICdJTkZPJyxcblx0XHRcdFx0XHR0ZXh0OiAnRG93bmxvYWQgbmV3IGxldmVscz8nXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRub05ld0xldmVsczoge1xuXHRcdFx0XHRydToge1xuXHRcdFx0XHRcdGxhYmVsOiAnSU5GTycsXG5cdFx0XHRcdFx0dGV4dDogJ9CS0Ysg0L/RgNC+0YjQu9C4INCy0YHQtSDQs9C+0LvQvtCy0L7Qu9C+0LzQutC4INCyINC40LPRgNC1LiDQntC20LjQtNCw0LnRgtC1INC90L7QstGL0YUg0YPRgNC+0LLQvdC10Lkg0LrQsNC20LTRg9GOINC90LXQtNC10LvRjiEnXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGVuOiB7XG5cdFx0XHRcdFx0bGFiZWw6ICdJTkZPJyxcblx0XHRcdFx0XHR0ZXh0OiAnWW91IHBhc3NlZCBhbGwgdGhlIHB1enpsZXMgaW4gdGhlIGdhbWUuIEV4cGVjdCBuZXcgbGV2ZWxzIGV2ZXJ5IHdlZWshJ1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZmFpbExvYWROZXdMZXZlbHM6IHtcblx0XHRcdFx0cnU6IHtcblx0XHRcdFx0XHRsYWJlbDogJ0lORk8nLFxuXHRcdFx0XHRcdHRleHQ6ICfQntGC0YHRg9GC0YHRgtCy0YPQtdGCINGB0L7QtdC00LjQvdC10L3QuNC1INGBINGB0LXRgNCy0LXRgNC+0LwuJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRlbjoge1xuXHRcdFx0XHRcdGxhYmVsOiAnSU5GTycsXG5cdFx0XHRcdFx0dGV4dDogJ05vIGNvbm5lY3Rpb24gdG8gdGhlIHNlcnZlci4nXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fVxuXHR9XG5cdHJlcXVlc3ROZXdMZXZlbHMoKSB7XG5cdFx0dmFyIHVybCA9IGAke3RoaXMucmVwb3NpdG9yeX0vbGV2ZWxzJHt0aGlzLmdhbWUucGxheS5jdXJyZW50TGV2ZWwrMX0uanNvbmA7XG5cblx0XHR0aGlzLmdhbWUud2luZG93TWFuYWdlci5hZGRXaW5kb3codGhpcy50cmFuc2xhdGVzLmFza1t0aGlzLmdhbWUuc2V0dGluZ3MubGFuZ10sICgpID0+IHtcblx0XHRcdCQuZ2V0SlNPTih1cmwpXG5cdFx0XHRcdC5kb25lKChkYXRhKSA9PiB7XG5cdFx0XHRcdFx0dGhpcy5nYW1lLnBsYXkubGV2ZWxzID0gdGhpcy5nYW1lLnBsYXkubGV2ZWxzLmNvbmNhdChkYXRhKTtcblx0XHRcdFx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnbGV2ZWxzJywgSlNPTi5zdHJpbmdpZnkodGhpcy5nYW1lLnBsYXkubGV2ZWxzKSk7XG5cdFx0XHRcdFx0dGhpcy5nYW1lLnBsYXkubG9hZExldmVsKHRoaXMuZ2FtZS5wbGF5LmN1cnJlbnRMZXZlbCArIDEpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQuZmFpbCgoZXJyKSA9PiB7XG5cdFx0XHRcdFx0dmFyIGNvbmZpZztcblxuXHRcdFx0XHRcdGlmIChlcnIuc3RhdHVzID09PSA0MDQpIGNvbmZpZyA9IHRoaXMudHJhbnNsYXRlcy5ub05ld0xldmVsc1t0aGlzLmdhbWUuc2V0dGluZ3MubGFuZ107XG5cdFx0XHRcdFx0ZWxzZSBjb25maWcgPSB0aGlzLnRyYW5zbGF0ZXMuZmFpbExvYWROZXdMZXZlbHNbdGhpcy5nYW1lLnNldHRpbmdzLmxhbmddO1xuXG5cdFx0XHRcdFx0dGhpcy5nYW1lLndpbmRvd01hbmFnZXIuYWRkV2luZG93KGNvbmZpZywgKCkgPT4ge1xuXHRcdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB0aGlzLmdhbWUubmF2aWdhdGlvbi50b01lbnUoKSwgMzAwKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBBamF4UmVxdWVzdHM7IiwiY2xhc3MgTmF2aWdhdGlvbiB7XG5cdGNvbnN0cnVjdG9yKGdhbWUpIHtcblx0XHR0aGlzLmdhbWUgPSBnYW1lO1xuXG5cdFx0dGhpcy5fYmluZEV2ZW50cygpO1xuXHR9XG5cdF9iaW5kRXZlbnRzKCkge1xuXHRcdC8vIENvcmRvdmEgQVBJXG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncGF1c2UnLCB0aGlzLnBhdXNlLmJpbmQodGhpcyksIGZhbHNlKTtcblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdyZXN1bWUnLCB0aGlzLnJlc3VtZS5iaW5kKHRoaXMpLCBmYWxzZSk7XG5cdH1cblxuXHR0b01lbnUoKSB7XG5cdFx0dGhpcy5nYW1lLnNwbGFzaC5zaG93KCk7XG5cdFx0dGhpcy5nYW1lLm1lbnUuc2NlbmUuc2hvdygpO1xuXHRcdHRoaXMuZ2FtZS5pbnRlcmZhY2Uuc2NlbmUuaGlkZSgpO1xuXHRcdHRoaXMuZ2FtZS5wbGF5LnNjZW5lLmhpZGUoKTtcblx0XHR0aGlzLmdhbWUuc2V0dGluZ3Muc2NlbmUuaGlkZSgpO1xuXHR9XG5cblx0dG9TZXR0aW5ncygpIHtcblx0XHR0aGlzLmdhbWUuc3BsYXNoLnNob3coKTtcblx0XHR0aGlzLmdhbWUuc2V0dGluZ3Muc2NlbmUuc2hvdygpO1xuXHRcdHRoaXMuZ2FtZS5tZW51LnNjZW5lLmhpZGUoKTtcblx0XHR0aGlzLmdhbWUuaW50ZXJmYWNlLnNjZW5lLmhpZGUoKTtcblx0XHR0aGlzLmdhbWUucGxheS5zY2VuZS5oaWRlKCk7XG5cdH1cblxuXHR0b1BsYXkoKSB7XG5cdFx0dGhpcy5nYW1lLnNwbGFzaC5zaG93KCk7XG5cdFx0dGhpcy5nYW1lLnBsYXkuc2NlbmUuc2hvdygpO1xuXHRcdHRoaXMuZ2FtZS5pbnRlcmZhY2Uuc2NlbmUuc2hvdygpO1xuXHRcdHRoaXMuZ2FtZS5zZXR0aW5ncy5zY2VuZS5oaWRlKCk7XG5cdFx0dGhpcy5nYW1lLm1lbnUuc2NlbmUuaGlkZSgpO1xuXG5cdFx0dGhpcy5nYW1lLnBsYXkubG9hZExldmVsKCk7XG5cdH1cblxuXHRwYXVzZSgpIHtcblx0XHR0aGlzLmdhbWUubXVzaWMuc3RvcCgpO1xuXHRcdHRoaXMuZ2FtZS5lZmZlY3QudG9nZ2xlKGZhbHNlKTtcblx0fVxuXG5cdHJlc3VtZSgpIHtcblx0XHR0aGlzLmdhbWUuc2V0dGluZ3MuaXNNdXNpYyAmJiB0aGlzLmdhbWUubXVzaWMucGxheSgpO1xuXHRcdHRoaXMuZ2FtZS5lZmZlY3QudG9nZ2xlKHRydWUpO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTmF2aWdhdGlvbjsiLCJjbGFzcyBXaW5kb3dNYW5hZ2VyIHtcblx0Y29uc3RydWN0b3IoZ2FtZSkge1xuXHRcdHRoaXMuZ2FtZSA9IGdhbWU7XG5cblx0XHR0aGlzLmNsb3NpbmdTcGVlZCA9IDMwMDtcblx0XHR0aGlzLmlzQ2xvc2luZyA9IGZhbHNlO1xuXG5cdFx0dGhpcy53aW5kb3cgPSAkKCcjd2luZG93Jyk7XG5cdFx0dGhpcy5jb250ZW50ID0gJCgnI2NvbnRlbnQnKTtcblx0XHR0aGlzLmxhYmVsID0gdGhpcy53aW5kb3cuZmluZCgnaDEnKTtcblx0XHR0aGlzLnRleHQgPSB0aGlzLndpbmRvdy5maW5kKCdwJyk7XG5cdFx0dGhpcy5idXR0b24gPSB0aGlzLndpbmRvdy5maW5kKCdidXR0b24nKTtcblxuXHRcdC8vIGNhbGxiYWNrXG5cdFx0dGhpcy5vbjtcblxuXHRcdHRoaXMuX2JpbmRFdmVudHMoKTtcblx0XHR0aGlzLmNsb3NlKCk7XG5cdH1cblx0X2JpbmRFdmVudHMoKSB7XG5cdFx0dGhpcy5idXR0b24ub24oJ2NsaWNrJywgKCgpID0+IHtcblx0XHRcdHRoaXMud2luZG93LmZhZGVPdXQoKCkgPT4gdGhpcy5jbG9zZSgpKTtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4gdGhpcy5vbiAmJiB0aGlzLm9uKCksIDUwMCk7XG5cdFx0fSkpO1xuXHR9XG5cdGFkZFdpbmRvdyhjb25maWcsIGNiKSB7XG5cdFx0dGhpcy5sYWJlbC5odG1sKGNvbmZpZy5sYWJlbCk7XG5cdFx0dGhpcy50ZXh0Lmh0bWwoY29uZmlnLnRleHQpO1xuXHRcdHRoaXMub24gPSBjYjtcblxuXHRcdHRoaXMub3BlbigpO1xuXHR9XG5cdG9wZW4oKSB7XG5cdFx0dGhpcy53aW5kb3cuc2hvdygpO1xuXHR9XG5cdGNsb3NlKCkge1xuXHRcdHRoaXMud2luZG93LmhpZGUoKTtcdFxuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gV2luZG93TWFuYWdlcjsiLCJ2YXIgYWRzID0ge1xuXHRpbml0OiBmdW5jdGlvbihnYW1lKSB7XG5cdFx0YWRzLmdhbWUgPSBnYW1lO1xuXHRcdGFkcy5pc0xvYWQgPSBmYWxzZTtcblx0XHRpZighd2luZG93LkNvY29vbiB8fCBnYW1lLmVkaXRpb24gPT09ICdQQUlEJykgcmV0dXJuO1xuXG5cdFx0YWRzLmludGVyc3RpdGlhbCA9IENvY29vbi5BZC5BZE1vYi5jcmVhdGVJbnRlcnN0aXRpYWwoXCJhZCBtb2Iga2V5XCIpO1xuXG5cdFx0YWRzLmludGVyc3RpdGlhbC5vbihcImxvYWRcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRhZHMuaXNMb2FkID0gdHJ1ZTtcblx0XHR9KTtcblx0fSxcblx0bG9hZCgpIHtcblx0XHRpZih3aW5kb3cuQ29jb29uICYmIGFkcy5nYW1lLmVkaXRpb24gPT09ICdGUkVFJykge1xuXHRcdFx0YWRzLmludGVyc3RpdGlhbC5sb2FkKCk7XG5cdFx0XHRhZHMuaXNMb2FkID0gZmFsc2U7XG5cdFx0fVxuXHR9LFxuXHRzaG93KCkge1xuXHRcdGlmKHdpbmRvdy5Db2Nvb24gJiYgYWRzLmdhbWUuZWRpdGlvbiA9PT0gJ0ZSRUUnKSB7XG5cdFx0XHRhZHMuaW50ZXJzdGl0aWFsLnNob3coKTtcblx0XHR9XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBhZHM7XG4iLCJ2YXIgaGVscGVyID0ge1xuXHRnZXRIZWlnaHRUcmlhbmdsZSh4LCB5LCB4MiwgeTIsIHgzLCB5Mykge1xuXHRcdC8v0LTQu9C40L3RiyDRgdGC0L7RgNC+0L0g0YLRgNC10YPQs9C+0LvRjNC90LjQutCwXG5cdFx0dmFyIEFDID0gaGVscGVyLmdldERpc3RhbmNlKHgsIHksIHgzLCB5Myk7XG5cdFx0dmFyIEJDID0gaGVscGVyLmdldERpc3RhbmNlKHgyLCB5MiwgeDMsIHkzKTtcblx0XHR2YXIgQUIgPSBoZWxwZXIuZ2V0RGlzdGFuY2UoeCwgeSwgeDIsIHkyKTtcblxuXHRcdC8v0L/QvtC70YPQv9C10YDQuNC80LXRgtGAXG5cdFx0dmFyIHAgPSAoQUMrQkMrQUIpLzI7XG5cblx0XHQvL9Ck0L7RgNC80YPQu9CwINC00LvQuNC90Ysg0LLRi9GB0L7RgtGLINGBINC/0L7QvNC+0YnRjNGOINGB0YLQvtGA0L7QvSDRgtGA0LXRg9Cz0L7Qu9GM0L3QuNC60LBcblx0XHR2YXIgaCA9ICgyL0FCKSpNYXRoLnNxcnQocCoocC1BQikqKHAtQUMpKihwLUJDKSk7XG5cblx0XHRyZXR1cm4gaDtcblx0fSxcblx0Z2V0RGlzdGFuY2UoeCwgeSwgeDIsIHkyKSB7XG5cdFx0Ly/QtNC70LjQvdGLINGB0YLQvtGA0L7QvSDRgtGA0LXRg9Cz0L7Qu9GM0L3QuNC60LBcblx0XHRyZXR1cm4gTWF0aC5zcXJ0KE1hdGgucG93KHgyLXgsIDIpICsgTWF0aC5wb3coeTIteSwgMikpO1xuXHR9LFxuXHRnZXRsb25n0KFvb3Jkc0xpbmUoeCwgeSwgeDIsIHkyLCBuKSB7XG5cdFx0dmFyIGxvbmdYID0geDIgLSB4O1xuXHRcdHZhciBsb25nWSA9IHkyIC0geTtcblx0XHRcblx0XHRyZXR1cm4ge3g6IHgyK2xvbmdYKm4sIHk6IHkyK2xvbmdZKm59O1xuXHR9LFxuXHRpc0NvbnRhaW5zKHJ4LCByeSwgcncsIHJoLCB4LCB5KSB7XG5cdFx0cmV0dXJuIHggPj0gcnggJiYgeCA8PSByeCtydyAmJiB5ID49IHJ5ICYmIHkgPD0gcnkrcmg7XG5cdH0sXG5cdGludFJhbmRSYW5nZShtaW4sIG1heCkge1xuXHQgIFx0cmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSkgKyBtaW47XG5cdH0sXG5cdGZsb2F0UmFuZFJhbmdlKG1pbiwgbWF4KSB7XG5cdCAgXHRyZXR1cm4gKyhNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW4pLnRvRml4ZWQoMSk7XG5cdH0sXG5cdGluUmFuZ2VBcnJheSh2YWx1ZSwgYXJyKSB7XG5cdFx0aWYodmFsdWUgPiBhcnIubGVuZ3RoLTEpIHJldHVybiAwO1xuXHRcdGVsc2UgaWYodmFsdWUgPCAwKSByZXR1cm4gYXJyLmxlbmd0aC0xO1xuXHRcdGVsc2UgcmV0dXJuIHZhbHVlO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGhlbHBlcjsiLCJ2YXIgbm90aWZpY2F0aW9ucyA9IGZ1bmN0aW9uKGdhbWUpIHtcblx0aWYoIXdpbmRvdy5wbHVnaW5zIHx8ICF3aW5kb3cucGx1Z2lucy5PbmVTaWduYWwpIHJldHVybjtcblxuXHR2YXIgbm90aWZpY2F0aW9uT3BlbmVkQ2FsbGJhY2sgPSBmdW5jdGlvbihqc29uRGF0YSkge1xuXHRcdGNvbnNvbGUubG9nKCdub3RpZmljYXRpb25PcGVuZWRDYWxsYmFjazogJyArIEpTT04uc3RyaW5naWZ5KGpzb25EYXRhKSk7XG5cdH07XG5cblx0d2luZG93LnBsdWdpbnMuT25lU2lnbmFsXG5cdFx0LnN0YXJ0SW5pdChcIk9uZVNpZ25hbCBrZXlcIiwgXCJnb29nbGVQbGF5IGlkXCIpXG5cdFx0LmhhbmRsZU5vdGlmaWNhdGlvbk9wZW5lZChub3RpZmljYXRpb25PcGVuZWRDYWxsYmFjaylcblx0XHQuZW5kSW5pdCgpO1xuXG5cdHdpbmRvdy5wbHVnaW5zLk9uZVNpZ25hbC5zZW5kVGFnKCdlZGl0aW9uJywgZ2FtZS5lZGl0aW9uKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBub3RpZmljYXRpb25zOyIsImNvbnN0IGhlbHBlciA9IHJlcXVpcmUoJy4uL21peGlucy9oZWxwZXInKTtcblxuY2xhc3MgQ2FudmFzRWZmZWN0IHtcblx0Y29uc3RydWN0b3IoZ2FtZSwgY29uZmlnKSB7XG5cdFx0dGhpcy5nYW1lID0gZ2FtZTtcblxuXHRcdHRoaXMuc2NlbmUgPSAkKCcjZWZmZWN0Jyk7XG5cdFx0dGhpcy5zY2VuZVswXS53aWR0aCA9IHRoaXMuZ2FtZS53O1xuXHRcdHRoaXMuc2NlbmVbMF0uaGVpZ2h0ID0gdGhpcy5nYW1lLmg7XG5cblx0XHR0aGlzLmN0eCA9IHRoaXMuc2NlbmVbMF0uZ2V0Q29udGV4dCgnMmQnKTtcblx0XHR0aGlzLmlzUmVuZGVyR3JhcGh5ID0gdHJ1ZTtcblxuXHRcdHRoaXMucGFydGljbGVzID0gW107XG5cblx0XHR0aGlzLmltYWdlID0gbmV3IEltYWdlKCk7XG5cdFx0dGhpcy5pbWFnZS5vbmxvYWQgPSAoKSA9PiB7XG5cdFx0XHR0aGlzLmNyZWF0ZVBhcnRpY2xlcyhjb25maWcucGFydGljbGVzLCBjb25maWcuY29uZmlnKTtcblx0XHRcdHRoaXMubG9vcCgpO1xuXHRcdH1cblx0XHR0aGlzLmltYWdlLnNyYyA9IGNvbmZpZy5pbWFnZTtcblx0fVxuXHR0b2dnbGUoYm9vbCkge1xuXHRcdHRoaXMuaXNSZW5kZXJHcmFwaHkgPSBib29sO1xuXHRcdGJvb2wgPyB0aGlzLnNjZW5lLnNob3coKSA6IHRoaXMuc2NlbmUuaGlkZSgpO1xuXHRcdGJvb2wgJiYgdGhpcy5sb29wKCk7XG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHRoaXMuc2NlbmVbMF0ud2lkdGggPSB0aGlzLmdhbWUudztcblx0XHR0aGlzLnNjZW5lWzBdLmhlaWdodCA9IHRoaXMuZ2FtZS5oO1x0XHRcblx0fVxuXG5cdGxvb3AoKSB7XG5cdFx0aWYoIXRoaXMuaXNSZW5kZXJHcmFwaHkpIHJldHVybjtcblxuXHRcdHRoaXMudXBkYXRlKCk7XG5cdFx0dGhpcy5kcmF3KCk7XG5cblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5sb29wLmJpbmQodGhpcykpO1xuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRmb3IobGV0IHAgb2YgdGhpcy5wYXJ0aWNsZXMpIHtcblx0XHRcdHAudXBkYXRlKCk7XG5cdFx0fVxuXHR9XG5cblx0ZHJhdygpIHtcblx0XHR0aGlzLmNsZWFyU2NyZWVuKCk7XG5cblx0XHRmb3IobGV0IHAgb2YgdGhpcy5wYXJ0aWNsZXMpIHtcblx0XHRcdHAuZHJhdygpO1xuXHRcdH1cblx0fVxuXHRjbGVhclNjcmVlbigpIHtcblx0XHR0aGlzLmN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5nYW1lLncsIHRoaXMuZ2FtZS5oKTtcblx0fVxuXG5cdGNyZWF0ZVBhcnRpY2xlcyhjb3VudCwgY29uZmlnKSB7XG5cdFx0Zm9yKGxldCBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcblx0XHRcdHRoaXMucGFydGljbGVzLnB1c2gobmV3IFBhcnRpY2xlKHRoaXMsIHtcblx0XHRcdFx0cjogICAgIGhlbHBlci5pbnRSYW5kUmFuZ2UoY29uZmlnLnJbMF0sIGNvbmZpZy5yWzFdKSxcblx0XHRcdFx0eDogICAgIGhlbHBlci5pbnRSYW5kUmFuZ2UoY29uZmlnLnhbMF0sIGNvbmZpZy54WzFdKSxcblx0XHRcdFx0eTogICAgIGhlbHBlci5pbnRSYW5kUmFuZ2UoY29uZmlnLnlbMF0sIGNvbmZpZy55WzFdKSxcblx0XHRcdFx0dmVjWDogIGhlbHBlci5pbnRSYW5kUmFuZ2UoY29uZmlnLnZlY1hbMF0sIGNvbmZpZy52ZWNZWzFdKSxcblx0XHRcdFx0dmVjWTogIGhlbHBlci5pbnRSYW5kUmFuZ2UoY29uZmlnLnZlY1lbMF0sIGNvbmZpZy52ZWNZWzFdKSxcblx0XHRcdFx0YWxwaGE6IGhlbHBlci5mbG9hdFJhbmRSYW5nZShjb25maWcuYWxwaGFbMF0sIGNvbmZpZy5hbHBoYVsxXSlcblx0XHRcdH0pKTtcblx0XHR9XG5cdH1cbn1cblxuY2xhc3MgUGFydGljbGUge1xuXHRjb25zdHJ1Y3RvcihlZmZlY3QsIHByb3ApIHtcblx0XHR0aGlzLmVmZmVjdCA9IGVmZmVjdDtcblx0XHR0aGlzLmdhbWUgPSB0aGlzLmVmZmVjdC5nYW1lO1xuXG5cdFx0dGhpcy5yID0gcHJvcC5yIHx8IDEwO1xuXHRcdHRoaXMueCA9IHByb3AueCB8fCAwO1xuXHRcdHRoaXMueSA9IHByb3AueSB8fCAwO1xuXHRcdHRoaXMudmVjWCA9IHByb3AudmVjWCB8fCAxO1xuXHRcdHRoaXMudmVjWSA9IHByb3AudmVjWSB8fCAxO1xuXHRcdHRoaXMuYWxwaGEgPSBwcm9wLmFscGhhIHx8IDE7XG5cdH1cblxuXHR1cGRhdGUoKSB7XG5cdFx0aWYodGhpcy54ICsgdGhpcy5yIDwgMCkge1xuXHRcdFx0dGhpcy54ID0gdGhpcy5nYW1lLncrdGhpcy5yO1xuXHRcdFx0dGhpcy52ZWNZID0gaGVscGVyLmludFJhbmRSYW5nZSgtdGhpcy52ZWNZLCB0aGlzLnZlY1kpO1xuXG5cdFx0fSBlbHNlIGlmKHRoaXMueCAtIHRoaXMuciA+IHRoaXMuZ2FtZS53KSB7XG5cdFx0XHR0aGlzLnggPSAtdGhpcy5yO1xuXHRcdFx0dGhpcy52ZWNZID0gaGVscGVyLmludFJhbmRSYW5nZSgtdGhpcy52ZWNZLCB0aGlzLnZlY1kpO1xuXG5cdFx0fSBpZih0aGlzLnkgKyB0aGlzLnIgPCAwKSB7XG5cdFx0XHR0aGlzLnkgPSB0aGlzLmdhbWUuaCt0aGlzLnI7XG5cdFx0XHR0aGlzLnZlY1ggPSBoZWxwZXIuaW50UmFuZFJhbmdlKC10aGlzLnZlY1gsIHRoaXMudmVjWCk7XG5cblx0XHR9IGVsc2UgaWYodGhpcy55IC0gdGhpcy5yID4gdGhpcy5nYW1lLmgpIHtcblx0XHRcdHRoaXMueSA9IC10aGlzLnI7XG5cdFx0XHR0aGlzLnZlY1ggPSBoZWxwZXIuaW50UmFuZFJhbmdlKC10aGlzLnZlY1gsIHRoaXMudmVjWCk7XG5cdFx0fVxuXG5cdFx0dGhpcy54ICs9IHRoaXMudmVjWDtcblx0XHR0aGlzLnkgKz0gdGhpcy52ZWNZO1xuXHR9XG5cdGRyYXcoKSB7XG5cdFx0dGhpcy5lZmZlY3QuY3R4Lmdsb2JhbEFscGhhID0gdGhpcy5hbHBoYTtcblx0XHR0aGlzLmVmZmVjdC5jdHguZHJhd0ltYWdlKFxuXHRcdFx0dGhpcy5lZmZlY3QuaW1hZ2UsXG5cdFx0XHR0aGlzLngtdGhpcy5yLFxuXHRcdFx0dGhpcy55LXRoaXMuciwgXG5cdFx0XHR0aGlzLnIqMiwgXG5cdFx0XHR0aGlzLnIqMlxuXHRcdCk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDYW52YXNFZmZlY3Q7IiwidmFyIGhlbHBlciA9IHJlcXVpcmUoJy4uL21peGlucy9oZWxwZXInKTtcblxuY2xhc3MgSW50ZXJmYWNlIHtcblx0Y29uc3RydWN0b3IoZ2FtZSkge1xuXHRcdHRoaXMuZ2FtZSA9IGdhbWU7XG5cblx0XHR0aGlzLnNjZW5lID0gJCgnI2ludGVyZmFjZScpO1xuXG5cdFx0dGhpcy5sYWJlbCA9ICQoJyNsYWJlbCcpO1xuXHRcdHRoaXMuc3RlcHMgPSAkKCcjc3RlcHMnKTtcblx0XHR0aGlzLmludGVyc2VjdGlvbnMgPSAkKCcjaW50ZXJzZWN0aW9ucycpO1xuXHRcdFxuXHRcdHRoaXMucmVzdGFydCA9ICQoJyNyZXN0YXJ0Jyk7XG5cdFx0dGhpcy5oaW50ID0gJCgnI2hpbnQnKTtcblx0XHR0aGlzLmNsb3NlUGF0aCA9ICQoJyNjbG9zZVBhdGgnKTtcblxuXHRcdHRoaXMuX2JpbmRFdmVudHMoKTtcblx0fVxuXG5cdF9iaW5kRXZlbnRzKCkge1xuXHRcdHRoaXMucmVzdGFydC5vbignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHR0aGlzLmdhbWUucmVzdGFydENsaWNrcysrO1xuXHRcdFx0aWYodGhpcy5nYW1lLnJlc3RhcnRDbGlja3MgPiAyMCkge1xuXHRcdFx0XHR0aGlzLmdhbWUuYWRzLnNob3coKTtcblx0XHRcdFx0dGhpcy5nYW1lLnJlc3RhcnRDbGlja3MgPSAwO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmdhbWUucGxheS5yZXN0YXJ0TGV2ZWwoKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuY2xvc2VQYXRoLm9uKCdjbGljaycsICgpID0+IHtcblx0XHRcdHRoaXMuZ2FtZS5wbGF5LmxldmVsLmNsb3NlUGF0aCgpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5oaW50Lm9uKCdjbGljaycsICgpID0+IHtcblx0XHRcdGlmKE1hdGgucm91bmQodGhpcy5nYW1lLnBsYXkubGV2ZWwuY2xpY2tzL3RoaXMuZ2FtZS5wbGF5LmxldmVsLmNvbmZpZy5jbGlja3MpID4gdGhpcy5nYW1lLnBsYXkubGV2ZWwuY3VycmVudEhpbnQpIHtcblx0XHRcdFx0dGhpcy5nYW1lLmFkcy5zaG93KCk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2FtZS5wbGF5LmxldmVsLnNob3dIaW50KCk7XG5cdFx0fSk7XG5cdH1cblxuXHRzZWxlY3RCdXR0b25zKGNvbmZpZykge1xuXHRcdGZvcihsZXQga2V5IGluIGNvbmZpZylcblx0XHRcdHRoaXNba2V5XSAmJiBjb25maWdba2V5XSA/IHRoaXNba2V5XS5zaG93KCkgOiB0aGlzW2tleV0uaGlkZSgpO1xuXHR9XG5cblx0dXBkYXRlR2FtZUluZm8oKSB7XG5cdFx0dGhpcy5pbnRlcnNlY3Rpb25zLmh0bWwoJ0lOVEVSU0VDVElPTlMgJyArIHRoaXMuZ2FtZS5wbGF5LmxldmVsLmludGVyc2VjdGlvbnNMZWZ0KTtcblx0XHR0aGlzLnN0ZXBzLmh0bWwoJ1NURVBTICcgKyB0aGlzLmdhbWUucGxheS5sZXZlbC5zdGVwc0xlZnQpO1xuXHRcdHRoaXMubGFiZWwuaHRtbCh0aGlzLmdhbWUucGxheS5sZXZlbC5sYWJlbCk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBJbnRlcmZhY2U7IiwiY2xhc3MgTWVudSB7XG5cdGNvbnN0cnVjdG9yKGdhbWUpIHtcblx0XHR0aGlzLmdhbWUgPSBnYW1lO1xuXG5cdFx0dGhpcy5zY2VuZSA9ICQoJyNtZW51Jyk7XG5cblx0XHR0aGlzLnN0YXJ0ID0gJCgnLnN0YXJ0Jyk7XG5cdFx0dGhpcy5zZXR1cCA9ICQoJy5zZXR1cCcpO1xuXHRcdHRoaXMuZXhpdCA9ICQoJy5leGl0Jyk7XG5cdFx0dGhpcy50dXRvcmlhbCA9ICQoJy50dXRvcmlhbCcpO1xuXG5cdFx0dGhpcy5fYmluZEV2ZW50cygpO1xuXHRcdHRoaXMuX2NyZWF0ZVdpbmRvd3MoKTtcblx0fVxuXHRfYmluZEV2ZW50cygpIHtcblx0XHR0aGlzLnN0YXJ0Lm9uKCdjbGljaycsICgpID0+IHRoaXMuZ2FtZS5uYXZpZ2F0aW9uLnRvUGxheSgpKTtcblx0XHR0aGlzLnNldHVwLm9uKCdjbGljaycsICgpID0+IHRoaXMuZ2FtZS5uYXZpZ2F0aW9uLnRvU2V0dGluZ3MoKSk7XG5cdFx0dGhpcy5leGl0Lm9uKCdjbGljaycsICgpID0+IHRoaXMuZ2FtZS5uYXZpZ2F0aW9uLnRvTWVudSgpKTtcblx0XHR0aGlzLnR1dG9yaWFsLm9uKCdjbGljaycsICgpID0+IHRoaXMuc2hvd1R1dG9yaWFsKCkpO1xuXHR9XG5cdF9jcmVhdGVXaW5kb3dzKCkge1xuXHRcdGlmKCFsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnaXNTaG93SW5mbycpKSB7XG5cdFx0XHR0aGlzLmdhbWUud2luZG93TWFuYWdlci5hZGRXaW5kb3coe1xuXHRcdFx0XHRcImxhYmVsXCI6IFwiSU5GT1wiLFxuXHRcdFx0XHRcInRleHRcIjogYFxuXHRcdFx0XHRcdFRvIFNldHRpbmdzLCBwcmVzcyBTIDxicj5cblx0XHRcdFx0XHRTaG93IFR1dG9yaWFsLCBwcmVzcyBUXG5cdFx0XHRcdGBcblx0XHRcdH0sICgpID0+IHtcblx0XHRcdFx0dGhpcy5zaG93VHV0b3JpYWwoKTtcblx0XHRcdH0pO1xuXHRcdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2lzU2hvd0luZm8nLCAxKTtcblx0XHR9XG5cdH1cblx0c2hvd1R1dG9yaWFsKCkge1xuXHRcdHRoaXMuZ2FtZS53aW5kb3dNYW5hZ2VyLmFkZFdpbmRvdyh7XG5cdFx0XHRcImxhYmVsXCI6IFwiVFVUT1JJQUxcIixcblx0XHRcdFwidGV4dFwiOiBcItCU0LvRjyDQv9GA0L7RhdC+0LbQtNC10L3QuNGPINCz0L7Qu9C+0LLQvtC70L7QvNC60Lgg0L3QtdC+0LHRhdC+0LTQuNC80L4g0L/QtdGA0LXRgdC10LrQsNGC0Ywg0LjQs9GA0L7QstGL0LUg0YLQvtGH0LrQuCDQu9C40L3QuNGP0LzQuCwg0LrQvtGC0L7RgNGL0LUg0LLRiyDRgNCw0YHRgdGC0LDQstC70Y/QtdGC0LUg0L3QsNC20LDRgtC40Y/QvNC4INC/0L4g0Y3QutGA0LDQvdGDLCDQvtC00L3QsNC60L4g0LfQsNC/0L7QvNC90LjRgtC1LCDRh9GC0L4g0LvQuNC90LjQuCDRj9Cy0LvRj9GO0YLRgdGPINCx0LXRgdC60L7QvdC10YfQvdGL0LzQuCwg0L3QviDQktGLINCy0LjQtNC40YLQtSDRgtC+0LvRjNC60L4g0L7RgtGA0LXQt9C60Lgg0Y3RgtC40YUg0LvQuNC90LjQuSEg0JIg0LjQs9GA0LUg0YLQsNC6INC20LUg0L/RgNC40YHRg9GC0YHRgtCy0YPRjtGCINGA0LDQt9C70LjRh9C90YvQuSDQutC+0LzQsdC40L3QsNGG0LjQuCDQvtCx0YrQtdC60YLQvtCyLiDQndCw0L/RgNC40LzQtdGAINC10YHRgtGMINGC0L7Rh9C60LgsINC60L7RgtC+0YDRi9C1INC90LXQu9GM0LfRjyDQv9C10YDQtdGB0LXQutCw0YLRjCDQuCDRgtCw0Log0LTQsNC70LXQtSwg0YEg0Y3RgtC40Lwg0JLQsNC8INC90LXQvtCx0YXQvtC00LjQvNC+INGA0LDQt9C+0LHRgNCw0YLRjNGB0Y8g0Lgg0YDQtdGI0LDRgtGMINCz0L7Qu9C+0LLQvtC70L7QvNC60Lgg0YHQsNC80LjQvCFcIlxuXHRcdH0pO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTWVudTsiLCJjb25zdCBMZXZlbCA9IHJlcXVpcmUoJy4uL2xldmVsL0xldmVsJyk7XG5cbmNsYXNzIFBsYXkge1xuXHRjb25zdHJ1Y3RvcihnYW1lKSB7XG5cdFx0dGhpcy5nYW1lID0gZ2FtZTtcblxuXHRcdHRoaXMuc2NlbmUgPSAkKCcjZ2FtZScpO1xuXHRcdHRoaXMucGFwZXIgPSBTbmFwKCdzdmcnKTtcblx0XHR0aGlzLnBhcGVyLmF0dHIoe1xuXHRcdFx0d2lkdGg6IHRoaXMuZ2FtZS53LFxuXHRcdFx0aGVpZ2h0OiB0aGlzLmdhbWUuaFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5jdXJyZW50TGV2ZWwgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY3VycmVudExldmVsJykgLSAwIHx8IDA7XG5cdFx0dGhpcy5sZXZlbHMgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnbGV2ZWxzJykgPyBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdsZXZlbHMnKSkgOiByZXF1aXJlKCcuLi9sZXZlbHMnKTtcblx0XHR0aGlzLmlzTGV2ZWxPdmVyID0gZmFsc2U7XG5cblx0XHR0aGlzLl9iaW5kRXZlbnRzKCk7XG5cdH1cblx0X2JpbmRFdmVudHMoKSB7XG5cdFx0JCgnI2dhbWUnKS5vbignY2xpY2snLCAoZSkgPT4gdGhpcy51c2VyQWN0aW9uKGUpKTtcblx0XHQkKCcjaW50ZXJmYWNlJykub24oJ2NsaWNrJywgKGUpID0+IHRoaXMudXNlckFjdGlvbihlKSk7XG5cdH1cblxuXHRyZXNpemUoKSB7XG5cdFx0dGhpcy5wYXBlci5hdHRyKHtcblx0XHRcdHdpZHRoOiB0aGlzLmdhbWUudyxcblx0XHRcdGhlaWdodDogdGhpcy5nYW1lLmhcblx0XHR9KTtcblxuXHRcdHRoaXMucmVzdGFydExldmVsKCk7XG5cdH1cblxuXHR1c2VyQWN0aW9uKGUpIHtcblx0XHRpZihlLnRhcmdldC50YWdOYW1lID09PSAnQlVUVE9OJykgcmV0dXJuO1xuXG5cdFx0dmFyIHggPSBNYXRoLnJvdW5kKGUuY2xpZW50WC90aGlzLmdhbWUuem9vbSk7XG5cdFx0dmFyIHkgPSBNYXRoLnJvdW5kKGUuY2xpZW50WS90aGlzLmdhbWUuem9vbSk7XG5cblx0XHRpZih0aGlzLmxldmVsLmFyZWFzLmFjdGl2YXRlQXJlYSh4LCB5KSAmJiB0aGlzLmxldmVsLnN0ZXBzTGVmdCAmJiAhdGhpcy5pc0xldmVsT3Zlcikge1xuXHRcdFx0dGhpcy5sZXZlbC5zdGVwc0xlZnQtLTtcblx0XHRcdHRoaXMubGV2ZWwuY2xpY2tzKys7XG5cdFx0XHR0aGlzLmxldmVsLnVwZGF0ZSgpO1xuXHRcdFx0dGhpcy5sZXZlbC51c2VyUGF0aC5hZGRQb2ludCh4LCB5KTtcblx0XHRcdHRoaXMubGV2ZWwudXNlci5hZGRDaXJjbGUoeCwgeSwgJ3VzZXInKTtcblx0XHRcdHRoaXMubGV2ZWwuY2hlY2tMZXZlbE92ZXIoKTtcblx0XHRcdHRoaXMuZ2FtZS5pbnRlcmZhY2UudXBkYXRlR2FtZUluZm8oKTtcblx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjbGlja3MnLCB0aGlzLmxldmVsLmNsaWNrcyk7XG5cdFx0fVxuXHR9XG5cblx0bG9hZExldmVsKGx2bCA9IHRoaXMuY3VycmVudExldmVsLCBpc05ldyA9IHRydWUpIHtcblx0XHRpZih0aGlzLmxldmVsc1tsdmxdKSB7XG5cdFx0XHR0aGlzLmN1cnJlbnRMZXZlbCA9IGx2bDtcblxuXHRcdFx0dGhpcy5kZWxldGVMZXZlbCgpO1xuXHRcdFx0dGhpcy5sZXZlbCA9IG5ldyBMZXZlbCh0aGlzLCBpc05ldywgdGhpcy5sZXZlbHNbbHZsXSk7XG5cdFx0XHR0aGlzLmdhbWUuaW50ZXJmYWNlLnVwZGF0ZUdhbWVJbmZvKCk7XG5cblx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjdXJyZW50TGV2ZWwnLCB0aGlzLmN1cnJlbnRMZXZlbCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuZ2FtZS5hamF4UmVxdWVzdHMucmVxdWVzdE5ld0xldmVscygpO1xuXHRcdH1cblx0fVxuXHRkZWxldGVMZXZlbCgpIHtcblx0XHRpZih0aGlzLmxldmVsKSB7XG5cdFx0XHR0aGlzLmxldmVsLnN2Zy5yZW1vdmUoKTtcblx0XHRcdHRoaXMubGV2ZWwgPSBudWxsO1xuXHRcdH1cblx0fVxuXG5cdG5leHRMZXZlbCgpIHtcblx0XHRpZighdGhpcy5pc0xldmVsT3Zlcikge1xuXHRcdFx0dGhpcy5sb2FkTGV2ZWwodGhpcy5jdXJyZW50TGV2ZWwrMSwgdHJ1ZSk7XG5cdFx0fVx0XHRcblx0fVxuXHRiYWNrTGV2ZWwoKSB7XG5cdFx0aWYoIXRoaXMuaXNMZXZlbE92ZXIpIHtcblx0XHRcdHRoaXMubG9hZExldmVsKHRoaXMuY3VycmVudExldmVsLTEsIHRydWUpO1xuXHRcdH1cdFx0XG5cdH1cblx0cmVzdGFydExldmVsKCkge1xuXHRcdGlmKCF0aGlzLmlzTGV2ZWxPdmVyKSB7XG5cdFx0XHR0aGlzLmxvYWRMZXZlbCh0aGlzLmN1cnJlbnRMZXZlbCwgZmFsc2UpO1xuXHRcdH1cblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXk7ICIsImNvbnN0IGhlbHBlciA9IHJlcXVpcmUoJy4uL21peGlucy9oZWxwZXInKTtcblxuY2xhc3MgU2V0dGluZ3Mge1xuXHRjb25zdHJ1Y3RvcihnYW1lKSB7XG5cdFx0dGhpcy5nYW1lID0gZ2FtZTtcblxuXHRcdHRoaXMuc2NlbmUgPSAkKCcjc2V0dGluZ3MnKTtcblxuXHRcdHRoaXMucHJvcE11c2ljID0gJCgnI3Byb3BNdXNpYycpO1xuXHRcdHRoaXMucHJvcEVmZmVjdCA9ICQoJyNwcm9wRWZmZWN0Jyk7XG5cdFx0dGhpcy5wcm9wTGFuZyA9ICQoJyNwcm9wTGFuZycpO1xuXG5cdFx0dGhpcy5jdXJMYW5nID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2xhbmcnKS0wIHx8IDA7XG5cdFx0dGhpcy5sYW5ncyA9IFsnZW4nLCAncnUnXTtcblx0XHR0aGlzLmxhbmcgPSB0aGlzLmxhbmdzW3RoaXMuY3VyTGFuZ107XG5cdFx0XG5cdFx0dGhpcy5pc011c2ljID0gdHJ1ZTtcblx0XHR0aGlzLmlzR3JhcGhpY3MgPSB0cnVlO1xuXG5cdFx0dGhpcy5fYmluZEV2ZW50cygpO1xuXHR9XG5cdF9iaW5kRXZlbnRzKCkge1xuXHRcdHRoaXMucHJvcE11c2ljLmNoaWxkcmVuKCkub24oJ2NsaWNrJywgKCkgPT4gdGhpcy50b2dnbGVNdXNpYygpKTtcblx0XHR0aGlzLnByb3BFZmZlY3QuY2hpbGRyZW4oKS5vbignY2xpY2snLCAoKSA9PiB0aGlzLnRvZ2dsZUVmZmVjdCgpKTtcblx0XHR0aGlzLnByb3BMYW5nLmNoaWxkcmVuKCkub24oJ2NsaWNrJywgKCkgPT4gdGhpcy5zZWxlY3RMYW5nKCkpO1xuXHR9XG5cblx0dG9nZ2xlTXVzaWMoKSB7XG5cdFx0dGhpcy5pc011c2ljID0gIXRoaXMuaXNNdXNpYztcblxuXHRcdHRoaXMucHJvcE11c2ljLmNoaWxkcmVuKCkuaHRtbCh0aGlzLmlzTXVzaWMgPyAnT04nIDogJ09GRicpO1xuXHRcdHRoaXMuaXNNdXNpYyA/IHRoaXMuZ2FtZS5tdXNpYy5wbGF5KCkgOiB0aGlzLmdhbWUubXVzaWMuc3RvcCgpO1xuXHR9XG5cdHRvZ2dsZUVmZmVjdCgpIHtcblx0XHR0aGlzLmlzR3JhcGhpY3MgPSAhdGhpcy5pc0dyYXBoaWNzO1xuXG5cdFx0dGhpcy5wcm9wRWZmZWN0LmNoaWxkcmVuKCkuaHRtbCh0aGlzLmlzR3JhcGhpY3MgPyAnT04nIDogJ09GRicpO1xuXHRcdHRoaXMuZ2FtZS5lZmZlY3QudG9nZ2xlKHRoaXMuaXNHcmFwaGljcyk7XG5cdH1cblx0c2VsZWN0TGFuZygpIHtcblx0XHR0aGlzLmN1ckxhbmcgPSBoZWxwZXIuaW5SYW5nZUFycmF5KHRoaXMuY3VyTGFuZyArIDEsIHRoaXMubGFuZ3MpO1xuXHRcdHRoaXMubGFuZyA9IHRoaXMubGFuZ3NbdGhpcy5jdXJMYW5nXTtcblxuXHRcdHRoaXMucHJvcExhbmcuY2hpbGRyZW4oKS5odG1sKHRoaXMubGFuZy50b1VwcGVyQ2FzZSgpKTtcblx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnbGFuZycsIHRoaXMuY3VyTGFuZyk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZXR0aW5nczsiLCJjbGFzcyBTcGxhc2gge1xuXHRjb25zdHJ1Y3RvcihnYW1lKSB7XG5cdFx0dGhpcy5nYW1lID0gZ2FtZTtcblx0XHRcblx0XHR0aGlzLnNwbGFzaCA9ICQoJyNzcGxhc2gnKTtcblx0fVxuXG5cdHNob3coY2IpIHtcblx0XHR0aGlzLnNwbGFzaFxuXHRcdFx0LmNzcyh7XG5cdFx0XHRcdG9wYWNpdHk6IDEsXG5cdFx0XHRcdGRpc3BsYXk6ICdibG9jaydcblx0XHRcdH0pXG5cdFx0XHQuZmFkZU91dCg0MDAsIGNiKTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNwbGFzaDsiXX0=
