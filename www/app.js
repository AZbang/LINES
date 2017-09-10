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
		repository: 'https://raw.githubusercontent.com/AZbang/LINES_CONSTRUCTOR/master/levels',
		edition: 'PAID'
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

		this.game.play.loadLevel(+localStorage.getItem('currentLevel'));
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
		if(this.game.settings.lang == 'ru') {
			this.game.windowManager.addWindow({
				label: "TUTORIAL I",
				text: "Для прохождения головоломки необходимо пересекать игровые точки линиями, которые вы расставляете нажатиями по экрану, однако запомните, что линии являются бесконечными, но Вы видите только отрезки этих линий!"
			}, () => {
				this.game.windowManager.addWindow({
					label: "TUTORIAL II",
					text: "В игре так же присутствуют различный комбинации объектов. Например есть точки, которые нельзя пересекать и так далее, с этим Вам необходимо разобраться и решать головоломки самим!"
				});
			});
		} else {
			this.game.windowManager.addWindow({
				label: "TUTORIAL I",
				text: "To complete the puzzle, you need to cross the game points with lines that you place with the presses on the screen, but remember that the lines are endless, but you see only the segments of these lines!"
			}, () => {
				this.game.windowManager.addWindow({
					label: "TUTORIAL II",
					text: "In the game there are also different combinations of objects. For example, there are points that can not be crossed, and so on, with this you need to understand and solve the puzzles themselves!"
				});
			});
		}
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

		this.currentLevel = +localStorage.getItem('currentLevel') || 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2F6YmFuZy9MSU5FUy9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL2hvbWUvYXpiYW5nL0xJTkVTL3NyYy9qcy9HYW1lLmpzIiwiL2hvbWUvYXpiYW5nL0xJTkVTL3NyYy9qcy9mYWtlXzVlNDNiMWMuanMiLCIvaG9tZS9hemJhbmcvTElORVMvc3JjL2pzL2xldmVsL0FyZWFzTWFuYWdlci5qcyIsIi9ob21lL2F6YmFuZy9MSU5FUy9zcmMvanMvbGV2ZWwvQ2lyY2xlc01hbmFnZXIuanMiLCIvaG9tZS9hemJhbmcvTElORVMvc3JjL2pzL2xldmVsL0Nyb3NzQ2lyY2xlLmpzIiwiL2hvbWUvYXpiYW5nL0xJTkVTL3NyYy9qcy9sZXZlbC9IaW50Q2lyY2xlLmpzIiwiL2hvbWUvYXpiYW5nL0xJTkVTL3NyYy9qcy9sZXZlbC9MZXZlbC5qcyIsIi9ob21lL2F6YmFuZy9MSU5FUy9zcmMvanMvbGV2ZWwvUGF0aE1hbmFnZXIuanMiLCIvaG9tZS9hemJhbmcvTElORVMvc3JjL2pzL2xldmVsL1RvdWNoQXJlYS5qcyIsIi9ob21lL2F6YmFuZy9MSU5FUy9zcmMvanMvbGV2ZWwvVW5jcm9zc0NpcmNsZS5qcyIsIi9ob21lL2F6YmFuZy9MSU5FUy9zcmMvanMvbGV2ZWwvVW50b3VjaEFyZWEuanMiLCIvaG9tZS9hemJhbmcvTElORVMvc3JjL2pzL2xldmVsL1VzZXJDaXJjbGUuanMiLCIvaG9tZS9hemJhbmcvTElORVMvc3JjL2pzL2xldmVscy5qc29uIiwiL2hvbWUvYXpiYW5nL0xJTkVTL3NyYy9qcy9taXhpbnMvQWpheFJlcXVlc3RzLmpzIiwiL2hvbWUvYXpiYW5nL0xJTkVTL3NyYy9qcy9taXhpbnMvTmF2aWdhdGlvbi5qcyIsIi9ob21lL2F6YmFuZy9MSU5FUy9zcmMvanMvbWl4aW5zL1dpbmRvd01hbmFnZXIuanMiLCIvaG9tZS9hemJhbmcvTElORVMvc3JjL2pzL21peGlucy9hZHMuanMiLCIvaG9tZS9hemJhbmcvTElORVMvc3JjL2pzL21peGlucy9oZWxwZXIuanMiLCIvaG9tZS9hemJhbmcvTElORVMvc3JjL2pzL21peGlucy9ub3RpZmljYXRpb25zLmpzIiwiL2hvbWUvYXpiYW5nL0xJTkVTL3NyYy9qcy9zY2VuZXMvQ2FudmFzRWZmZWN0LmpzIiwiL2hvbWUvYXpiYW5nL0xJTkVTL3NyYy9qcy9zY2VuZXMvSW50ZXJmYWNlLmpzIiwiL2hvbWUvYXpiYW5nL0xJTkVTL3NyYy9qcy9zY2VuZXMvTWVudS5qcyIsIi9ob21lL2F6YmFuZy9MSU5FUy9zcmMvanMvc2NlbmVzL1BsYXkuanMiLCIvaG9tZS9hemJhbmcvTElORVMvc3JjL2pzL3NjZW5lcy9TZXR0aW5ncy5qcyIsIi9ob21lL2F6YmFuZy9MSU5FUy9zcmMvanMvc2NlbmVzL1NwbGFzaC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3gwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHNjZW5lc1xudmFyIENhbnZhc0VmZmVjdCA9IHJlcXVpcmUoJy4vc2NlbmVzL0NhbnZhc0VmZmVjdCcpO1xudmFyIFNldHRpbmdzID0gcmVxdWlyZSgnLi9zY2VuZXMvU2V0dGluZ3MnKTtcbnZhciBJbnRlcmZhY2UgPSByZXF1aXJlKCcuL3NjZW5lcy9JbnRlcmZhY2UnKTtcbnZhciBNZW51ID0gcmVxdWlyZSgnLi9zY2VuZXMvTWVudScpO1xudmFyIFBsYXkgPSByZXF1aXJlKCcuL3NjZW5lcy9QbGF5Jyk7XG52YXIgU3BsYXNoID0gcmVxdWlyZSgnLi9zY2VuZXMvU3BsYXNoJyk7XG5cbi8vIG1peGluc1xudmFyIE5hdmlnYXRpb24gPSByZXF1aXJlKCcuL21peGlucy9OYXZpZ2F0aW9uJyk7XG52YXIgV2luZG93TWFuYWdlciA9IHJlcXVpcmUoJy4vbWl4aW5zL1dpbmRvd01hbmFnZXInKTtcbnZhciBBamF4UmVxdWVzdHMgPSByZXF1aXJlKCcuL21peGlucy9BamF4UmVxdWVzdHMnKTtcbnZhciBoZWxwZXIgPSByZXF1aXJlKCcuL21peGlucy9oZWxwZXInKTtcblxuY2xhc3MgR2FtZSB7XG5cdGNvbnN0cnVjdG9yKGNvbmZpZykge1xuXHRcdCQoJyNzcGxhc2gnKS5mYWRlT3V0KCk7XG5cblx0XHR0aGlzLmVkaXRpb24gPSBjb25maWcuZWRpdGlvbiB8fCAnRlJFRSc7XG5cdFx0dGhpcy5ub3RpZmljYXRpb25zID0gcmVxdWlyZSgnLi9taXhpbnMvbm90aWZpY2F0aW9ucycpO1xuXHRcdHRoaXMuYWRzID0gcmVxdWlyZSgnLi9taXhpbnMvYWRzJyk7XG5cdFx0dGhpcy5ub3RpZmljYXRpb25zKHRoaXMpO1xuXHRcdHRoaXMuYWRzLmluaXQodGhpcyk7XG5cblx0XHR0aGlzLnpvb20gPSAkKHdpbmRvdykud2lkdGgoKS8xMDAwID4gMSA/IDEgOiAkKHdpbmRvdykud2lkdGgoKS8xMDAwO1xuXHRcdCQoJ2JvZHknKS5jc3MoJ3pvb20nLCB0aGlzLnpvb20pO1xuXG5cdFx0dGhpcy53ID0gTWF0aC5yb3VuZCgkKHdpbmRvdykud2lkdGgoKS90aGlzLnpvb20pO1xuXHRcdHRoaXMuaCA9IE1hdGgucm91bmQoJCh3aW5kb3cpLmhlaWdodCgpL3RoaXMuem9vbSk7XG5cdFx0dGhpcy5jZW50ZXJYID0gdGhpcy53LzI7XG5cdFx0dGhpcy5jZW50ZXJZID0gdGhpcy5oLzI7XG5cblx0XHR0aGlzLmxldmVsT3ZlckNsaWNrcyA9IDA7XG5cdFx0dGhpcy5yZXN0YXJ0Q2xpY2tzID0gMDtcblxuXHRcdHRoaXMubmF2aWdhdGlvbiA9IG5ldyBOYXZpZ2F0aW9uKHRoaXMpO1xuXHRcdHRoaXMud2luZG93TWFuYWdlciA9IG5ldyBXaW5kb3dNYW5hZ2VyKHRoaXMpO1xuXHRcdHRoaXMuYWpheFJlcXVlc3RzID0gbmV3IEFqYXhSZXF1ZXN0cyh0aGlzLCBjb25maWcucmVwb3NpdG9yeSk7XG5cblx0XHR0aGlzLmVmZmVjdCA9IG5ldyBDYW52YXNFZmZlY3QodGhpcywgY29uZmlnLmVmZmVjdCk7XG5cdFx0dGhpcy5wbGF5ID0gbmV3IFBsYXkodGhpcywgY29uZmlnLnBsYXkpO1xuXHRcdHRoaXMuc2V0dGluZ3MgPSBuZXcgU2V0dGluZ3ModGhpcyk7XG5cdFx0dGhpcy5pbnRlcmZhY2UgPSBuZXcgSW50ZXJmYWNlKHRoaXMpO1xuXHRcdHRoaXMubWVudSA9IG5ldyBNZW51KHRoaXMpO1xuXHRcdHRoaXMuc3BsYXNoID0gbmV3IFNwbGFzaCh0aGlzKTtcblxuXHRcdHRoaXMubmF2aWdhdGlvbi50b01lbnUoKTtcblxuXHRcdHRoaXMubXVzaWMgPSBBdWRpb0ZYKGNvbmZpZy5tdXNpYy5maWxlLCB7XG5cdFx0XHR2b2x1bWU6IDAuNSxcblx0XHRcdGxvb3A6IHRydWUsXG5cdFx0XHRhdXRvcGxheTogdHJ1ZSBcblx0XHR9KTtcblxuXHRcdC8vIGhlbHBlciBtZXRob2QgXCJyZXNpemVFbmRcIlxuXHRcdCQod2luZG93KS5yZXNpemUoZnVuY3Rpb24oKSB7XG5cdFx0XHRpZih0aGlzLnJlc2l6ZVRPKSBjbGVhclRpbWVvdXQodGhpcy5yZXNpemVUTyk7XG5cblx0XHRcdHRoaXMucmVzaXplVE8gPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKHRoaXMpLnRyaWdnZXIoJ3Jlc2l6ZUVuZCcpO1xuXHRcdFx0fSwgNTAwKTtcblx0XHR9KTtcblx0XHQkKHdpbmRvdykuYmluZCgncmVzaXplRW5kJywgKCkgPT4gdGhpcy5yZXNpemUoKSk7XG5cdH1cblx0cmVzaXplKCkge1xuXHRcdHRoaXMuem9vbSA9ICQod2luZG93KS53aWR0aCgpLzEwMDAgPiAxID8gMSA6ICQod2luZG93KS53aWR0aCgpLzEwMDA7XG5cdFx0JCgnYm9keScpLmNzcygnem9vbScsIHRoaXMuem9vbSk7XG5cblx0XHR0aGlzLncgPSBNYXRoLnJvdW5kKCQod2luZG93KS53aWR0aCgpL3RoaXMuem9vbSk7XG5cdFx0dGhpcy5oID0gTWF0aC5yb3VuZCgkKHdpbmRvdykuaGVpZ2h0KCkvdGhpcy56b29tKTtcblx0XHR0aGlzLmNlbnRlclggPSB0aGlzLncvMjtcblx0XHR0aGlzLmNlbnRlclkgPSB0aGlzLmgvMjtcblxuXHRcdHRoaXMuZWZmZWN0LnJlc2l6ZSgpO1xuXHRcdHRoaXMucGxheS5yZXNpemUoKTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEdhbWU7IiwiY29uc3QgR2FtZSA9IHJlcXVpcmUoJy4vR2FtZScpO1xuXG52YXIgcmVhZHkgPSBmdW5jdGlvbigpIHtcblx0dmFyIGdhbWUgPSBuZXcgR2FtZSh7XG5cdFx0cGxheToge1xuXHRcdFx0Y3VycmVudExldmVsOiAwXG5cdFx0fSxcblx0XHRlZmZlY3Q6IHtcblx0XHRcdHBhcnRpY2xlczogTWF0aC5yb3VuZCh3aW5kb3cuaW5uZXJXaWR0aC81MCksXG5cdFx0XHRpbWFnZTogJy4vYXNzZXRzL2ltZy9wYXJ0aWNsZS5wbmcnLFxuXHRcdFx0Y29uZmlnOiB7XG5cdFx0XHRcdHI6IFsyMCwgMTAwXSxcblx0XHRcdFx0eDogWzAsIHdpbmRvdy5pbm5lcldpZHRoXSxcblx0XHRcdFx0eTogWzAsIHdpbmRvdy5pbm5lckhlaWdodF0sXG5cdFx0XHRcdHZlY1g6IFstLjUsIC41XSxcblx0XHRcdFx0dmVjWTogWy0uNSwgLjVdLFxuXHRcdFx0XHRhbHBoYTogWy4xLCAuMl0sXG5cdFx0XHRcdGJsdXI6IFsuNywgLjhdXG5cdFx0XHR9XG5cdFx0fSxcblx0XHRtdXNpYzoge1xuXHRcdFx0ZmlsZTogJ2Fzc2V0cy9tdXNpYy9sb25lbGluZXNzLm9nZycsXG5cdFx0XHR2b2x1bWU6IDAuNSxcblx0XHRcdGxvb3A6IHRydWVcblx0XHR9LFxuXHRcdHJlcG9zaXRvcnk6ICdodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vQVpiYW5nL0xJTkVTX0NPTlNUUlVDVE9SL21hc3Rlci9sZXZlbHMnLFxuXHRcdGVkaXRpb246ICdQQUlEJ1xuXHR9KTtcbn1cblxuaWYod2luZG93LmNvcmRvdmEpIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZXJlYWR5JywgcmVhZHksIGZhbHNlKVxuZWxzZSB3aW5kb3cub25sb2FkID0gcmVhZHk7XG4iLCJjb25zdCBoZWxwZXIgPSByZXF1aXJlKCcuLi9taXhpbnMvaGVscGVyJyk7XG5jb25zdCBUb3VjaEFyZWEgPSByZXF1aXJlKCcuL1RvdWNoQXJlYScpO1xuY29uc3QgVW50b3VjaEFyZWEgPSByZXF1aXJlKCcuL1VudG91Y2hBcmVhJyk7XG5cbmNsYXNzIEFyZWFzTWFuYWdlciB7XG5cdGNvbnN0cnVjdG9yKGxldmVsLCBjb25maWcpIHtcblx0XHR0aGlzLmxldmVsID0gbGV2ZWw7XG5cdFx0dGhpcy5nYW1lID0gdGhpcy5sZXZlbC5nYW1lO1xuXHRcdHRoaXMuZ3JvdXAgPSB0aGlzLmxldmVsLnN2Zy5nKCk7XG5cblx0XHR0aGlzLmFyZWFzID0gW107XG5cblx0XHR0aGlzLl9wYXJzZUNvbmZpZyhjb25maWcgfHwgW10pO1xuXHR9XG5cblx0X3BhcnNlQ29uZmlnKGNvbmZpZykge1xuXHRcdGlmIChjb25maWcubGVuZ3RoKSB7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNvbmZpZy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHR2YXIgYXJlYSA9IGNvbmZpZ1tpXTtcblx0XHRcdFx0dGhpcy5hZGRBcmVhKFxuXHRcdFx0XHRcdHRoaXMubGV2ZWwuZ2FtZS5jZW50ZXJYICsgYXJlYS54LCBcblx0XHRcdFx0XHR0aGlzLmxldmVsLmdhbWUuY2VudGVyWSArIGFyZWEueSwgXG5cdFx0XHRcdFx0YXJlYS53LCBcblx0XHRcdFx0XHRhcmVhLmgsIFxuXHRcdFx0XHRcdGFyZWEudHlwZVxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLmFkZEFyZWEoMCwgMCwgdGhpcy5sZXZlbC5nYW1lLncsIHRoaXMubGV2ZWwuZ2FtZS5oLCAndG91Y2gnKTtcblx0XHR9XG5cdH1cblx0ZGVsZXRlQXJlYXMoKSB7XG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMuYXJlYXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuYXJlYXMucmVjdC5yZW1vdmUoKTtcblx0XHR9XG5cdFx0dGhpcy5hcmVhcyA9IFtdO1xuXHR9XG5cdGFjdGl2YXRlQXJlYSh4LCB5KSB7XG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMuYXJlYXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciByID0gdGhpcy5hcmVhc1tpXTtcblx0XHRcdGlmKGhlbHBlci5pc0NvbnRhaW5zKHIueCwgci55LCByLncsIHIuaCwgeCwgeSkpIHJldHVybiB0aGlzLmFyZWFzW2ldLnRvdWNoRXZlbnQoKTtcblx0XHR9XG5cdH1cblxuXHRhZGRBcmVhKHgsIHksIHcsIGgsIHR5cGUpIHtcblx0XHR2YXIgYSA9IG5ldyBBcmVhc01hbmFnZXIudHlwZXNbdHlwZV0odGhpcywgeCwgeSwgdywgaCk7XG5cdFx0dGhpcy5hcmVhcy5wdXNoKGEpO1xuXHR9XG59XG5cbkFyZWFzTWFuYWdlci50eXBlcyA9IHtcblx0dG91Y2g6IFRvdWNoQXJlYSxcblx0dW50b3VjaDogVW50b3VjaEFyZWFcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBBcmVhc01hbmFnZXI7IiwiY29uc3QgVXNlckNpcmNsZSA9IHJlcXVpcmUoJy4vVXNlckNpcmNsZScpO1xuY29uc3QgQ3Jvc3NDaXJjbGUgPSByZXF1aXJlKCcuL0Nyb3NzQ2lyY2xlJyk7XG5jb25zdCBVbmNyb3NzQ2lyY2xlID0gcmVxdWlyZSgnLi9VbmNyb3NzQ2lyY2xlJyk7XG5jb25zdCBIaW50Q2lyY2xlID0gcmVxdWlyZSgnLi9IaW50Q2lyY2xlJyk7XG5cbmNsYXNzIENpcmNsZXNNYW5hZ2VyIHtcblx0Y29uc3RydWN0b3IobGV2ZWwsIGNvbmZpZykge1xuXHRcdHRoaXMubGV2ZWwgPSBsZXZlbDtcblx0XHR0aGlzLmdhbWUgPSB0aGlzLmxldmVsLmdhbWU7XG5cdFx0dGhpcy5ncm91cCA9IHRoaXMubGV2ZWwuc3ZnLmcoKTtcblxuXHRcdHRoaXMuY2lyY2xlcyA9IFtdO1xuXG5cdFx0Y29uZmlnICYmIHRoaXMuX3BhcnNlQ29uZmlnKGNvbmZpZyk7XG5cdH1cblxuXHRfcGFyc2VDb25maWcoY29uZmlnKSB7XG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IGNvbmZpZy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGNpcmNsZSA9IGNvbmZpZ1tpXTtcblx0XHRcdHRoaXMuYWRkQ2lyY2xlKFxuXHRcdFx0XHR0aGlzLmxldmVsLmdhbWUuY2VudGVyWCArIGNpcmNsZS54LCBcblx0XHRcdFx0dGhpcy5sZXZlbC5nYW1lLmNlbnRlclkgKyBjaXJjbGUueSwgXG5cdFx0XHRcdGNpcmNsZS50eXBlXG5cdFx0XHQpO1xuXHRcdH1cblx0fVxuXHRkZWxldGVDaXJjbGVzKCkge1xuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLmNpcmNsZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuY2lyY2xlc1tpXS5jaXJjbGUucmVtb3ZlKCk7XG5cdFx0fVxuXHRcdHRoaXMuY2lyY2xlcyA9IFtdO1xuXHR9XG5cblx0YWRkQ2lyY2xlKHgsIHksIHR5cGUpIHtcblx0XHR2YXIgYyA9IG5ldyBDaXJjbGVzTWFuYWdlci50eXBlc1t0eXBlXSh0aGlzLCB4LCB5KTtcblx0XHR0aGlzLmNpcmNsZXMucHVzaChjKTtcblx0fVxufVxuQ2lyY2xlc01hbmFnZXIudHlwZXMgPSB7XG5cdHVzZXI6IFVzZXJDaXJjbGUsXG5cdHVuY3Jvc3M6IFVuY3Jvc3NDaXJjbGUsXG5cdGNyb3NzOiBDcm9zc0NpcmNsZSxcblx0aGludDogSGludENpcmNsZVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDaXJjbGVzTWFuYWdlcjsiLCJjbGFzcyBDcm9zc0NpcmNsZSB7XG5cdGNvbnN0cnVjdG9yKG1hbmFnZXIsIHgsIHkpIHtcblx0XHR0aGlzLm1hbmFnZXIgPSBtYW5hZ2VyO1xuXHRcdFxuXHRcdHRoaXMuY2lyY2xlID0gdGhpcy5tYW5hZ2VyLmdyb3VwLmNpcmNsZSh4LCB5LCAwKTtcblx0XHR0aGlzLmNpcmNsZS5hdHRyKHtcblx0XHRcdFx0ZmlsbDogJ3JnYigyMjgsIDc4LCA3OCknLFxuXHRcdFx0XHRzdHJva2VXaWR0aDogM1xuXHRcdH0pO1xuXHRcdHRoaXMuY2lyY2xlLmFuaW1hdGUoe1xuXHRcdFx0cjogMjVcblx0XHR9LCAxMDAwLCBtaW5hLmVsYXN0aWMpO1xuXG5cdFx0dGhpcy50eXBlID0gJ2Nyb3NzJztcblx0XHR0aGlzLnggPSB4O1xuXHRcdHRoaXMueSA9IHk7XG5cdFx0dGhpcy5yID0gMjU7XG5cblx0fVxuXHRzdGFydENyb3NzQW5pbWF0aW9uKCkge1xuXHRcdHRoaXMuY2lyY2xlLmFuaW1hdGUoe1xuXHRcdFx0ZmlsbDogJyM4QkMzNEEnXG5cdFx0fSwgMTAwMCk7XG5cdH1cblx0Y3Jvc3NFdmVudCgpIHtcblx0XHR0aGlzLm1hbmFnZXIubGV2ZWwuaW50ZXJzZWN0aW9uc0xlZnQtLTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENyb3NzQ2lyY2xlOyIsImNsYXNzIENyb3NzQ2lyY2xlIHtcblx0Y29uc3RydWN0b3IobWFuYWdlciwgeCwgeSkge1xuXHRcdHRoaXMubWFuYWdlciA9IG1hbmFnZXI7XG5cdFx0XG5cdFx0dGhpcy5jaXJjbGUgPSB0aGlzLm1hbmFnZXIuZ3JvdXAuY2lyY2xlKHgsIHksIDM1KTtcblx0XHR0aGlzLmNpcmNsZS5hdHRyKHtcblx0XHRcdGZpbGw6ICdyZ2JhKDIyNSwgMjI1LCAyMjUsIDAuMyknLFxuXHRcdFx0c3Ryb2tlOiAnI2ZmZicsXG5cdFx0XHRzdHJva2VXaWR0aDogMixcblx0XHRcdHI6IDBcblx0XHR9KTtcblx0XHR0aGlzLmNpcmNsZS5hbmltYXRlKHtcblx0XHRcdHI6IDMwXG5cdFx0fSwgNTAwLCBtaW5hLmVsYXN0aWMpO1xuXG5cdFx0dGhpcy50eXBlID0gJ2hpbnQnO1xuXHRcdHRoaXMuciA9IDM1O1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ3Jvc3NDaXJjbGU7IiwidmFyIGhlbHBlciA9IHJlcXVpcmUoJy4uL21peGlucy9oZWxwZXInKTtcbnZhciBDaXJjbGVzTWFuYWdlciA9IHJlcXVpcmUoJy4vQ2lyY2xlc01hbmFnZXInKTtcbnZhciBBcmVhc01hbmFnZXIgPSByZXF1aXJlKCcuL0FyZWFzTWFuYWdlcicpO1xudmFyIFBhdGhNYW5hZ2VyID0gcmVxdWlyZSgnLi9QYXRoTWFuYWdlcicpO1xuXG5jbGFzcyBMZXZlbCB7XG5cdGNvbnN0cnVjdG9yKHBsYXksIGlzTmV3LCBjb25maWcpIHtcblx0XHR0aGlzLmdhbWUgPSBwbGF5LmdhbWU7XG5cdFx0dGhpcy5wbGF5ID0gcGxheTtcblx0XHR0aGlzLmNvbmZpZyA9IGNvbmZpZyB8fCB7fVxuXHRcdHRoaXMuaXNOZXcgPSBpc05ldztcblxuXHRcdHRoaXMuc3ZnID0gdGhpcy5wbGF5LnBhcGVyLnN2ZygwLCAwLCB0aGlzLmdhbWUudywgdGhpcy5nYW1lLmgpO1xuXG5cdFx0dGhpcy5jdXJyZW50V2luZG93ID0gMDtcblxuXHRcdHRoaXMubGFiZWwgPSB0aGlzLmNvbmZpZy5sYWJlbCB8fCAnTEVWRUwnO1xuXHRcdHRoaXMuc3RlcHNMZWZ0ID0gdGhpcy5jb25maWcuc3RlcHMgfHwgMDtcblx0XHR0aGlzLmludGVyc2VjdGlvbnNMZWZ0ID0gdGhpcy5jb25maWcuaW50ZXJzZWN0aW9ucyB8fCAwO1xuXG5cdFx0dGhpcy5jbGlja3MgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY2xpY2tzJyktMCB8fCAwO1xuXHRcdHRoaXMuY3VycmVudEhpbnQgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY3VycmVudEhpbnQnKS0wIHx8IDA7XG5cblx0XHR0aGlzLmdhbWUuYWRzLmxvYWQoKTtcblx0XHR0aGlzLl9sb2FkTGV2ZWwoKTtcblx0XHR0aGlzLnVwZGF0ZSgpO1xuXHR9XG5cblx0X2xvYWRMZXZlbCgpIHtcblx0XHR0aGlzLmFyZWFzID0gbmV3IEFyZWFzTWFuYWdlcih0aGlzLCB0aGlzLmNvbmZpZy5hcmVhcyk7XG5cdFx0dGhpcy5oaW50cyA9IG5ldyBDaXJjbGVzTWFuYWdlcih0aGlzKTtcblx0XHR0aGlzLnVzZXJQYXRoID0gbmV3IFBhdGhNYW5hZ2VyKHRoaXMpO1xuXHRcdHRoaXMuY2lyY2xlcyA9IG5ldyBDaXJjbGVzTWFuYWdlcih0aGlzLCB0aGlzLmNvbmZpZy5vYmplY3RzKTtcblx0XHR0aGlzLnVzZXIgPSBuZXcgQ2lyY2xlc01hbmFnZXIodGhpcyk7XG5cblx0XHR0aGlzLmdhbWUuaW50ZXJmYWNlLnNlbGVjdEJ1dHRvbnMoe1xuXHRcdFx0cmVzdGFydDogICEhfnRoaXMuY29uZmlnLmJ1dHRvbnMuaW5kZXhPZignUicpLFxuXHRcdFx0Y2xvc2VQYXRoOiAhIX50aGlzLmNvbmZpZy5idXR0b25zLmluZGV4T2YoJ1onKSxcblx0XHRcdGhpbnQ6IGZhbHNlXG5cdFx0fSk7XG5cblx0XHR0aGlzLmdhbWUuaW50ZXJmYWNlLmhpbnQuY3NzKCdyaWdodCcsICEhfnRoaXMuY29uZmlnLmJ1dHRvbnMuaW5kZXhPZignWicpID8gMjEwIDogMTIwKTtcblxuXHRcdGlmICh0aGlzLmlzTmV3ICYmIHRoaXMuY29uZmlnLndpbmRvd3MpIHRoaXMubmV4dFdpbmRvdygpO1xuXHR9XG5cdHVwZGF0ZSgpIHtcblx0XHRpZih0aGlzLmNsaWNrcyA+PSB0aGlzLmNvbmZpZy5jbGlja3MpIHtcblx0XHRcdHRoaXMuZ2FtZS5pbnRlcmZhY2Uuc2VsZWN0QnV0dG9ucyh7aGludDogdHJ1ZX0pO1xuXHRcdH1cblx0fVxuXG5cdGNoZWNrTGV2ZWxPdmVyKCkge1xuXHRcdHRoaXMuY2hlY2tDb2xsaXNpb25MaW5lV2l0aENpcmNsZSgpO1xuXHRcdGlmICh0aGlzLmludGVyc2VjdGlvbnNMZWZ0IDw9IDApIHtcblx0XHRcdHRoaXMucGxheS5pc0xldmVsT3ZlciA9IHRydWU7XG5cblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHR0aGlzLmdhbWUubGV2ZWxPdmVyQ2xpY2tzKys7XG5cdFx0XHRcdGlmKHRoaXMuZ2FtZS5sZXZlbE92ZXJDbGlja3MgPiAyKSB7XG5cdFx0XHRcdFx0dGhpcy5nYW1lLmFkcy5zaG93KCk7XG5cdFx0XHRcdFx0dGhpcy5nYW1lLmxldmVsT3ZlckNsaWNrcyA9IDA7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnY2xpY2tzJywgMCk7XG5cdFx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjdXJyZW50SGludCcsIDApO1xuXG5cdFx0XHRcdHRoaXMucGxheS5pc0xldmVsT3ZlciA9IGZhbHNlO1xuXHRcdFx0XHR0aGlzLnBsYXkubmV4dExldmVsKCk7XG5cdFx0XHR9LCAxMDAwKTtcblx0XHR9XG5cdH1cblxuXHRjaGVja0NvbGxpc2lvbkxpbmVXaXRoQ2lyY2xlKCkge1xuXHRcdHZhciBsYXN0ID0gdGhpcy51c2VyUGF0aC5wb2ludHMubGVuZ3RoLTE7XG5cblx0XHQvL2lmIGNyZWF0ZWQgdXNlciBwb2ludHMgbW9yZSAxXG5cdFx0aWYgKGxhc3QpIHtcblxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNpcmNsZXMuY2lyY2xlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHR2YXIgY2lyY2xlID0gdGhpcy5jaXJjbGVzLmNpcmNsZXNbaV07XG5cdFx0XHRcdFxuXHRcdFx0XHQvL3VzZSBsYXN0IHR3byB1c2VyIHBvaW50c1xuXHRcdFx0XHR2YXIgcDEgPSB0aGlzLnVzZXJQYXRoLnBvaW50c1tsYXN0XTtcblx0XHRcdFx0dmFyIHAyID0gdGhpcy51c2VyUGF0aC5wb2ludHNbbGFzdCAtIDFdO1xuXG5cdFx0XHRcdC8vaWYgY29sbGlzaW9uIHRydWUsIGFuaW1hdGluZyBjdXJycmVudCBwb2ludFxuXHRcdFx0XHRpZiAoaGVscGVyLmdldEhlaWdodFRyaWFuZ2xlKHAxLngsIHAxLnksIHAyLngsIHAyLnksIGNpcmNsZS54LCBjaXJjbGUueSkgPCBjaXJjbGUucikge1xuXHRcdFx0XHRcdGNpcmNsZS5zdGFydENyb3NzQW5pbWF0aW9uKCk7XG5cblx0XHRcdFx0XHRpZiAoIWNpcmNsZS5pc0NvbGxpc2lvbikgY2lyY2xlLmNyb3NzRXZlbnQoKTtcblx0XHRcdFx0XHRjaXJjbGUuaXNDb2xsaXNpb24gPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0c2hvd0hpbnQoKSB7XG5cdFx0dGhpcy5jbGlja3MgPSBNYXRoLm1pbih0aGlzLmNsaWNrcywgdGhpcy5jb25maWcuaGludHMubGVuZ3RoKnRoaXMuY29uZmlnLmNsaWNrcyk7XG5cdFx0dGhpcy5oaW50cy5kZWxldGVDaXJjbGVzKCk7XG5cblx0XHR0aGlzLmN1cnJlbnRIaW50ID0gTWF0aC5yb3VuZCh0aGlzLmNsaWNrcy90aGlzLmNvbmZpZy5jbGlja3MpO1xuXHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjdXJyZW50SGludCcsIHRoaXMuY3VycmVudEhpbnQpO1xuXG5cdFx0dmFyIHBvcztcblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5jdXJyZW50SGludDsgaSsrKSB7XG5cdFx0XHRwb3MgPSB0aGlzLmNvbmZpZy5oaW50c1tpXTtcblx0XHRcdHRoaXMuaGludHMuYWRkQ2lyY2xlKHRoaXMuZ2FtZS5jZW50ZXJYK3Bvcy54LCB0aGlzLmdhbWUuY2VudGVyWStwb3MueSwgJ2hpbnQnKTtcblx0XHR9XG5cblx0XHR0aGlzLmdhbWUuaW50ZXJmYWNlLnNlbGVjdEJ1dHRvbnMoe2hpbnQ6IHRydWV9KVxuXHR9XG5cblx0bmV4dFdpbmRvdygpIHtcblx0XHR2YXIgd2luZHMgPSB0aGlzLmNvbmZpZy53aW5kb3dzW3RoaXMuZ2FtZS5zZXR0aW5ncy5sYW5nXTtcblx0XHRpZighd2luZHMgfHwgdGhpcy5jdXJyZW50V2luZG93ID4gd2luZHMubGVuZ3RoIC0gMSkgcmV0dXJuO1xuXG5cdFx0dGhpcy5nYW1lLndpbmRvd01hbmFnZXIuYWRkV2luZG93KHdpbmRzW3RoaXMuY3VycmVudFdpbmRvd10sICgpID0+IHRoaXMubmV4dFdpbmRvdygpKTtcblx0XHR0aGlzLmN1cnJlbnRXaW5kb3crKztcblx0fVxuXG5cdGNsb3NlUGF0aCgpIHtcblx0XHRpZighdGhpcy5pc0xldmVsQ2xvc2VQYXRoICYmIHRoaXMudXNlci5jaXJjbGVzLmxlbmd0aCkge1xuXHRcdFx0dGhpcy5pc0xldmVsQ2xvc2VQYXRoID0gdHJ1ZTtcblx0XHRcdHRoaXMudXNlclBhdGguY2xvc2VQYXRoKCk7XG5cdFx0XHR0aGlzLmNoZWNrTGV2ZWxPdmVyKCk7XG5cdFx0fVxuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTGV2ZWw7IiwiY2xhc3MgUGF0aE1hbmFnZXIge1xuXHRjb25zdHJ1Y3RvcihsZXZlbCkge1xuXHRcdHRoaXMubGV2ZWwgPSBsZXZlbDtcblx0XHR0aGlzLmdhbWUgPSB0aGlzLmxldmVsLmdhbWU7XG5cdFx0dGhpcy5wYXRoID0gdGhpcy5sZXZlbC5zdmcucGF0aCgnJyk7XG5cdFx0dGhpcy5wYXRoLmF0dHIoe1xuXHRcdFx0ZmlsbDogJ3RyYW5zcGFyZW50Jyxcblx0XHRcdHN0cm9rZTogJyNmZmYnLFxuXHRcdFx0c3Ryb2tlV2lkdGg6IDNcblx0XHR9KTtcblxuXHRcdHRoaXMucG9pbnRzID0gW107XG5cdH1cblx0YWRkUG9pbnQoeCwgeSkge1xuXHRcdHZhciBkID0gdGhpcy5wYXRoLmF0dHIoJ2QnKTtcblx0XHR0aGlzLnBhdGguYXR0cih7XG5cdFx0XHRkOiBgJHtkfSR7dGhpcy5wb2ludHMubGVuZ3RoID8gJ0wnIDogJ00nfSR7eH0sJHt5fWBcblx0XHR9KTtcblxuXHRcdHRoaXMucG9pbnRzLnB1c2goe3gsIHl9KTtcblx0fVxuXHRjbG9zZVBhdGgoKSB7XG5cdFx0dmFyIGQgPSB0aGlzLnBhdGguYXR0cignZCcpO1xuXHRcdHRoaXMucGF0aC5hdHRyKHtcblx0XHRcdGQ6IGAke2R9IFpgXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFkZFBvaW50KHRoaXMucG9pbnRzWzBdLngsIHRoaXMucG9pbnRzWzBdLnkpO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUGF0aE1hbmFnZXI7IiwiY2xhc3MgVG91Y2hBcmVhIHtcblx0Y29uc3RydWN0b3IobWFuYWdlciwgeCwgeSwgdywgaCkge1xuXHRcdHRoaXMubWFuYWdlciA9IG1hbmFnZXI7XG5cblx0XHR0aGlzLnJlY3QgPSB0aGlzLm1hbmFnZXIuZ3JvdXAucmVjdCh4LCB5LCB3LCBoKTtcblx0XHR0aGlzLnJlY3QuYXR0cih7XG5cdFx0XHRmaWxsOiAndHJhbnNwYXJlbnQnLFxuXHRcdFx0c3Ryb2tlOiAnI2ZmZicsXG5cdFx0XHRzdHJva2VXaWR0aDogNVxuXHRcdH0pO1xuXG5cdFx0dGhpcy50eXBlID0gJ3RvdWNoJztcblx0XHR0aGlzLnggPSB4IHx8IDA7XG5cdFx0dGhpcy55ID0geSB8fCAwO1xuXHRcdHRoaXMudyA9IHcgfHwgMDtcblx0XHR0aGlzLmggPSBoIHx8IDA7XG5cdH1cblx0dG91Y2hFdmVudCgpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRvdWNoQXJlYTsiLCJjbGFzcyBVbmNyb3NzQ2lyY2xlIHtcblx0Y29uc3RydWN0b3IobWFuYWdlciwgeCwgeSkge1xuXHRcdHRoaXMubWFuYWdlciA9IG1hbmFnZXI7XG5cdFx0XG5cdFx0dGhpcy5jaXJjbGUgPSB0aGlzLm1hbmFnZXIuZ3JvdXAuY2lyY2xlKHgsIHksIDI1KTtcblx0XHR0aGlzLmNpcmNsZS5hdHRyKHtcblx0XHRcdHI6IDI1LFxuXHRcdFx0ZmlsbDogJ3JnYmEoMTAzLCA1OCwgMTgzKScsXG5cdFx0XHRvcGFjaXR5OiAuNjMsXG5cdFx0XHRzdHJva2VXaWR0aDogM1xuXHRcdH0pO1xuXG5cdFx0dGhpcy50eXBlID0gJ3VuY3Jvc3MnO1xuXHRcdHRoaXMueCA9IHg7XG5cdFx0dGhpcy55ID0geTtcblx0XHR0aGlzLnIgPSAyNTtcblxuXHR9XG5cdHN0YXJ0Q3Jvc3NBbmltYXRpb24oKSB7XG5cdFx0dGhpcy5jaXJjbGUuYW5pbWF0ZSh7XG5cdFx0XHRyOiAyMCxcblx0XHRcdGZpbGw6ICcjZmZmJ1xuXHRcdH0sIDUwMCk7XG5cdH1cblx0Y3Jvc3NFdmVudCgpIHtcblx0XHR0aGlzLm1hbmFnZXIubGV2ZWwuaW50ZXJzZWN0aW9uc0xlZnQgPSAnWCc7XG5cdFx0dGhpcy5tYW5hZ2VyLmxldmVsLnN0ZXBzTGVmdCA9IDA7XHRcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFVuY3Jvc3NDaXJjbGU7IiwiY2xhc3MgVW50b3VjaEFyZWEge1xuXHRjb25zdHJ1Y3RvcihtYW5hZ2VyLCB4LCB5LCB3LCBoKSB7XG5cdFx0dGhpcy5tYW5hZ2VyID0gbWFuYWdlcjtcblxuXHRcdHRoaXMucmVjdCA9IHRoaXMubWFuYWdlci5ncm91cC5yZWN0KHgsIHksIHcsIGgpO1xuXHRcdHRoaXMucmVjdC5hdHRyKHtcblx0XHRcdGZpbGw6ICd0cmFuc3BhcmVudCcsXG5cdFx0XHRzdHJva2U6ICcjRkYzNTM1Jyxcblx0XHRcdG9wYWNpdHk6IDAuOCxcblx0XHRcdHN0cm9rZVdpZHRoOiA1XG5cdFx0fSk7XG5cblx0XHR0aGlzLnR5cGUgPSAndW50b3VjaCc7XG5cdFx0dGhpcy54ID0geCB8fCAwO1xuXHRcdHRoaXMueSA9IHkgfHwgMDtcblx0XHR0aGlzLncgPSB3IHx8IDA7XG5cdFx0dGhpcy5oID0gaCB8fCAwO1xuXHR9XG5cdHRvdWNoRXZlbnQoKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVW50b3VjaEFyZWE7IiwiY2xhc3MgVXNlckNpcmNsZSB7XG5cdGNvbnN0cnVjdG9yKG1hbmFnZXIsIHgsIHkpIHtcblx0XHR0aGlzLm1hbmFnZXIgPSBtYW5hZ2VyO1xuXHRcdFxuXHRcdHRoaXMuY2lyY2xlID0gdGhpcy5tYW5hZ2VyLmdyb3VwLmNpcmNsZSh4LCB5LCAwKTtcblx0XHR0aGlzLmNpcmNsZS5hdHRyKHtcblx0XHRcdGZpbGw6ICcjZmZmJ1xuXHRcdH0pO1xuXHRcdHRoaXMuY2lyY2xlLmFuaW1hdGUoe1xuXHRcdFx0cjogMjBcblx0XHR9LCAxMDAwLCBtaW5hLmVsYXN0aWMpO1xuXG5cdFx0dGhpcy50eXBlID0gJ3VzZXInO1xuXHRcdHRoaXMuciA9IDIwO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVXNlckNpcmNsZTsiLCJtb2R1bGUuZXhwb3J0cz1bXG4gIHtcbiAgICBcImxhYmVsXCI6IFwiRUFTWVwiLFxuICAgIFwib2JqZWN0c1wiOiBbXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXG4gICAgICAgIFwieFwiOiAwLFxuICAgICAgICBcInlcIjogMFxuICAgICAgfVxuICAgIF0sXG4gICAgXCJzdGVwc1wiOiAyLFxuICAgIFwiaW50ZXJzZWN0aW9uc1wiOiAxLFxuICAgIFwiYnV0dG9uc1wiOiBcIlJcIixcbiAgICBcIndpbmRvd3NcIjoge1xuICAgICAgXCJydVwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcbiAgICAgICAgICBcInRleHRcIjogXCLQkiDQttC40LLQvtC/0LjRgdC4LCDQutCw0Log0Lgg0LIg0LzQvtGA0LDQu9C4LCDQs9C70LDQstC90L7QtSDRgdC+0YHRgtC+0LjRgiDQsiDRgtC+0LwsINGH0YLQvtCx0Ysg0LIg0L3Rg9C20L3QvtC8INC80LXRgdGC0LUg0L/RgNC+0LLQtdGB0YLQuCDQu9C40L3QuNGOIOKAlCDQk9C40LvQsdC10YDRgiDQmtC40YIg0KfQtdGB0YLQtdGA0YLQvtC9XCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwibGFiZWxcIjogXCJJTkZPXCIsXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwi0KfRgtC+0LHRiyDQv9C10YDQtdC30LDQs9GA0YPQt9C40YLRjCDQuNCz0YDRgywg0L3QsNC20LzQuNGC0LUgUlwiXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcImVuXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgIFwibGFiZWxcIjogXCJMSU5FU1wiLFxuICAgICAgICAgIFwidGV4dFwiOiBcIkFydCwgbGlrZSBtb3JhbGl0eSwgY29uc2lzdHMgaW4gZHJhd2luZyB0aGUgbGluZSBzb21ld2hlcmUuIOKAlCBHaWxiZXJ0IEtlaXRoIENoZXN0ZXJ0b25cIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIklORk9cIixcbiAgICAgICAgICBcInRleHRcIjogXCJUbyByZXNldCB0aGUgZ2FtZSwgcHJlc3MgUlwiXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9XG4gIH0sXG4gIHtcbiAgICBcImxhYmVsXCI6IFwiSSBBTkdVTFVTXCIsXG4gICAgXCJvYmplY3RzXCI6IFtcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IC03NSxcbiAgICAgICAgXCJ5XCI6IC03NVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IC03NSxcbiAgICAgICAgXCJ5XCI6IDc1XG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxuICAgICAgICBcInhcIjogNzUsXG4gICAgICAgIFwieVwiOiAtNzVcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXG4gICAgICAgIFwieFwiOiA3NSxcbiAgICAgICAgXCJ5XCI6IDc1XG4gICAgICB9XG4gICAgXSxcbiAgICBcInN0ZXBzXCI6IDMsXG4gICAgXCJpbnRlcnNlY3Rpb25zXCI6IDQsXG4gICAgXCJidXR0b25zXCI6IFwiUlwiLFxuICAgIFwid2luZG93c1wiOiB7XG4gICAgICBcInJ1XCI6IFtcbiAgICAgICAge1xuICAgICAgICAgIFwibGFiZWxcIjogXCJMSU5FU1wiLFxuICAgICAgICAgIFwidGV4dFwiOiBcItCa0L7QvdC10YYg0YPQttC1INGB0L7QtNC10YDQttC40YLRgdGPINCyINC90LDRh9Cw0LvQtS4g4oCUINCU0LbQvtGA0LTQtiDQntGA0YPRjdC70LsuIDE5ODRcIiAgICAgICAgICBcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwibGFiZWxcIjogXCJJTkZPXCIsXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwi0J3QsNC20LzQuNGC0LUg0L3QsCBILCDRh9GC0L7QsdGLINC/0L7Qu9GD0YfQuNGC0Ywg0L/QvtC00YHQutCw0LfQutGDLCDQutC+0LPQtNCwINC+0L3QsCDQv9C+0Y/QstC40YLRgdGPXCJcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiZW5cIjogW1xuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwiVGhlIGVuZCBpcyBhbHJlYWR5IGNvbnRhaW5lZCBpbiB0aGUgYmVnaW5uaW5nLiAtIEdlb3JnZSBPcndlbGwuIDE5ODRcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIklORk9cIixcbiAgICAgICAgICBcInRleHRcIjogXCJQcmVzcyBILCB0byBnZXQgYSBjbHVlIHdoZW4gaXQgYXBwZWFyc1wiXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9LFxuICAgIFwiY2xpY2tzXCI6IDE4LFxuICAgIFwiaGludHNcIjogW1xuICAgICAge1wieFwiOiAyNTAsIFwieVwiOiAtMTI1fSxcbiAgICAgIHtcInhcIjogLTM1MCwgXCJ5XCI6IDB9LFxuICAgICAge1wieFwiOiAyNTAsIFwieVwiOiAxMjV9XG4gICAgXVxuICB9LFxuICB7XG4gICAgXCJsYWJlbFwiOiBcIlYgYW5kIElYXCIsXG4gICAgXCJpbnRlcnNlY3Rpb25zXCI6IDksXG4gICAgXCJzdGVwc1wiOiA0LFxuICAgIFwiY2xpY2tzXCI6IDUwLFxuICAgIFwib2JqZWN0c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiA5NSxcbiAgICAgICAgICAgIFwieVwiOiA5NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDAsXG4gICAgICAgICAgICBcInlcIjogOTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtOTUsXG4gICAgICAgICAgICBcInlcIjogOTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtOTUsXG4gICAgICAgICAgICBcInlcIjogMCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDAsXG4gICAgICAgICAgICBcInlcIjogMCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDk1LFxuICAgICAgICAgICAgXCJ5XCI6IDAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiA5NSxcbiAgICAgICAgICAgIFwieVwiOiAtOTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAwLFxuICAgICAgICAgICAgXCJ5XCI6IC05NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC05NSxcbiAgICAgICAgICAgIFwieVwiOiAtOTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiaGludHNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTI2OC41LFxuICAgICAgICAgICAgXCJ5XCI6IDE0MS41XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAzMzEuNSxcbiAgICAgICAgICAgIFwieVwiOiA0MS41XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMjY4LjUsXG4gICAgICAgICAgICBcInlcIjogLTU4LjVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDMzMS41LFxuICAgICAgICAgICAgXCJ5XCI6IC0xNTguNVxuICAgICAgICB9XG4gICAgXSxcbiAgICBcImJ1dHRvbnNcIjogXCJSXCIsXG4gICAgXCJhcmVhc1wiOiBudWxsLFxuICAgIFwiaGludFJVXCI6IG51bGwsXG4gICAgXCJoaW50VVNcIjogbnVsbFxuICB9LFxuICB7XG4gICAgXCJsYWJlbFwiOiBcIklJSSBJTiBBIFJPV1wiLFxuICAgIFwib2JqZWN0c1wiOiBbXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXG4gICAgICAgIFwieFwiOiAtNTAsXG4gICAgICAgIFwieVwiOiAtNTBcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXG4gICAgICAgIFwieFwiOiAwLFxuICAgICAgICBcInlcIjogLTUwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxuICAgICAgICBcInhcIjogNTAsXG4gICAgICAgIFwieVwiOiAtNTBcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXG4gICAgICAgIFwieFwiOiAtNTAsXG4gICAgICAgIFwieVwiOiAwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxuICAgICAgICBcInhcIjogMCxcbiAgICAgICAgXCJ5XCI6IDBcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXG4gICAgICAgIFwieFwiOiA1MCxcbiAgICAgICAgXCJ5XCI6IDBcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXG4gICAgICAgIFwieFwiOiAtNTAsXG4gICAgICAgIFwieVwiOiA1MFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IDAsXG4gICAgICAgIFwieVwiOiA1MFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IDUwLFxuICAgICAgICBcInlcIjogNTBcbiAgICAgIH0sXG4gICAgXSxcbiAgICBcInN0ZXBzXCI6IDIsXG4gICAgXCJpbnRlcnNlY3Rpb25zXCI6IDUsXG4gICAgXCJidXR0b25zXCI6IFwiUlwiLFxuICAgIFwid2luZG93c1wiOiB7XG4gICAgICBcImVuXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgIFwibGFiZWxcIjogXCJMSU5FU1wiLFxuICAgICAgICAgIFwidGV4dFwiOiBcIkRvIG5vdCBsb3NlIG5vdCBvbmUgd2hvIGtub3dzIGFsbCB0aGUgb3B0aW9ucyBvZiB2aWN0b3J5LCBidXQgdGhlIG9uZSB3aG8ga25vd3MgYWxsIHRoZSBvcHRpb25zIGRlZmVhdC4g4oCUIEhhcm91biBBZ2F0c2Fyc2t5XCJcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwicnVcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwi0J3QtSDQv9GA0L7QuNCz0YDRi9Cy0LDQtdGCINC90LUg0YLQvtGCLCDQutGC0L4g0LfQvdCw0LXRgiDQstGB0LUg0LLQsNGA0LjQsNC90YLRiyDQv9C+0LHQtdC00YssINCwINGC0L7Rgiwg0LrRgtC+INC30L3QsNC10YIg0LLRgdC1INCy0LDRgNC40LDQvdGC0Ysg0L/QvtGA0LDQttC10L3QuNGPLiDigJQg0JPQsNGA0YPQvSDQkNCz0LDRhtCw0YDRgdC60LjQuVwiXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9LFxuICAgIFwiY2xpY2tzXCI6IDIyLFxuICAgIFwiaGludHNcIjogW1xuICAgICAge1wieFwiOiAtMTAwLCBcInlcIjogMTAwfSxcbiAgICAgIHtcInhcIjogNjAsIFwieVwiOiAtMTAwfVxuICAgIF1cbiAgfSxcbiAge1xuICAgIFwibGFiZWxcIjogXCJDT05JVU5DVElTXCIsXG4gICAgXCJpbnRlcnNlY3Rpb25zXCI6IDQsXG4gICAgXCJzdGVwc1wiOiAzLFxuICAgIFwiY2xpY2tzXCI6IDUwLFxuICAgIFwib2JqZWN0c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMjMwLFxuICAgICAgICAgICAgXCJ5XCI6IC04MCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDIyMCxcbiAgICAgICAgICAgIFwieVwiOiAtODAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAyNzAsXG4gICAgICAgICAgICBcInlcIjogMjAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMjgwLFxuICAgICAgICAgICAgXCJ5XCI6IDIwLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcImhpbnRzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC01LFxuICAgICAgICAgICAgXCJ5XCI6IC0zMFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTEzMCxcbiAgICAgICAgICAgIFwieVwiOiAtNVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMTIwLFxuICAgICAgICAgICAgXCJ5XCI6IC01XG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiYXJlYXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTE4OSxcbiAgICAgICAgICAgIFwieVwiOiAtMTE5LFxuICAgICAgICAgICAgXCJ3XCI6IDM2OCxcbiAgICAgICAgICAgIFwiaFwiOiAyMDgsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ0b3VjaFwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiYnV0dG9uc1wiOiBcIlJcIixcbiAgICBcIndpbmRvd3NcIjoge1xuICAgICAgXCJydVwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcbiAgICAgICAgICBcInRleHRcIjogXCLQldGB0LvQuCDQsdGLINC+0YLRgNC10LfQvtC6INC90LUg0YHRh9C40YLQsNC7INGB0LXQsdGPINCx0LXRgdC60L7QvdC10YfQvdC+0Lkg0L/RgNGP0LzQvtC5LCDQvtC9INCy0YDRj9C0INC70Lgg0LHRiyDQtNC+0YLRj9C90YPQuyDQvtGCINC+0LTQvdC+0Lkg0LTQviDQtNGA0YPQs9C+0Lkg0YLQvtGH0LrQuCDigJQg0KTQtdC70LjQutGBINCa0YDQuNCy0LjQvVwiXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcImVuXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgIFwibGFiZWxcIjogXCJMSU5FU1wiLFxuICAgICAgICAgIFwidGV4dFwiOiBcIklmIHRoZSBsaW5lIHNlZ21lbnQgaXMgbm90IGNvbnNpZGVyZWQgaGltc2VsZiBhbiBpbmZpbml0ZSBzdHJhaWdodCBsaW5lLCBoZSBpcyB1bmxpa2VseSB0byByZWFjaCBmcm9tIG9uZSB0byBhbm90aGVyIHBvaW50IOKAlCBGZWxpeCBLcml2aW5lXCJcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH1cbiAgfSxcbiAge1xuICAgIFwibGFiZWxcIjogXCJSQVRTXCIsXG4gICAgXCJpbnRlcnNlY3Rpb25zXCI6IDgsXG4gICAgXCJzdGVwc1wiOiA1LFxuICAgIFwib2JqZWN0c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMjMwLFxuICAgICAgICAgICAgXCJ5XCI6IC0zMCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDIyMCxcbiAgICAgICAgICAgIFwieVwiOiAtMzAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMzAsXG4gICAgICAgICAgICBcInlcIjogLTIzMCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDIwLFxuICAgICAgICAgICAgXCJ5XCI6IC0yMzAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMTAwLFxuICAgICAgICAgICAgXCJ5XCI6IDI2MCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDEwMCxcbiAgICAgICAgICAgIFwieVwiOiAyNjAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMTM1LFxuICAgICAgICAgICAgXCJ5XCI6IDIyNSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDEzNSxcbiAgICAgICAgICAgIFwieVwiOiAyMjUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiY2xpY2tzXCI6IDUwLFxuICAgIFwiaGludHNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMTQ1LFxuICAgICAgICAgICAgXCJ5XCI6IDIwXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtODAsXG4gICAgICAgICAgICBcInlcIjogMTcwXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtNSxcbiAgICAgICAgICAgIFwieVwiOiAtMTgwXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiA3MCxcbiAgICAgICAgICAgIFwieVwiOiAxNzBcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0xNTUsXG4gICAgICAgICAgICBcInlcIjogMjBcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJhcmVhc1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMTc1LFxuICAgICAgICAgICAgXCJ5XCI6IC0xNzUsXG4gICAgICAgICAgICBcIndcIjogMzUwLFxuICAgICAgICAgICAgXCJoXCI6IDM1MCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInRvdWNoXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJidXR0b25zXCI6IFwiUlwiLFxuICAgIFwid2luZG93c1wiOiB7XG4gICAgICBcInJ1XCI6IFtcbiAgICAgICAge1xuICAgICAgICAgIFwibGFiZWxcIjogXCJMSU5FU1wiLFxuICAgICAgICAgIFwidGV4dFwiOiBcItCd0LDRh9C40L3QsNGPINGBINC+0L/RgNC10LTQtdC70LXQvdC90L7QuSDRgtC+0YfQutC4LCDQstC+0LfQstGA0LDRgiDRg9C20LUg0L3QtdCy0L7Qt9C80L7QttC10L0uINCt0YLQvtC5INGC0L7Rh9C60Lgg0L3QsNC00L4g0LTQvtGB0YLQuNGH0YwuIOKAlCDQpNGA0LDQvdGGINCa0LDRhNC60LBcIlxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJlblwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcbiAgICAgICAgICBcInRleHRcIjogXCJUaGVyZSBpcyBhIHBvaW50IG9mIG5vIHJldHVybi4gVGhpcyBwb2ludCBoYXMgdG8gYmUgcmVhY2hlZC4g4oCUIEZyYW56IEthZmthXCJcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH1cbiAgfSxcbiAge1xuICAgIFwibGFiZWxcIjogXCJUUklHT05VU1wiLFxuICAgIFwiY2xpY2tzXCI6IDUwLFxuICAgIFwib2JqZWN0c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMTgwLFxuICAgICAgICAgICAgXCJ5XCI6IC01LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTEzMCxcbiAgICAgICAgICAgIFwieVwiOiAtNTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAxNzAsXG4gICAgICAgICAgICBcInlcIjogNDUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiA3MCxcbiAgICAgICAgICAgIFwieVwiOiAtNTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAxMjAsXG4gICAgICAgICAgICBcInlcIjogOTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtODAsXG4gICAgICAgICAgICBcInlcIjogOTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiaGludHNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTI4MCxcbiAgICAgICAgICAgIFwieVwiOiA5NVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTMwLFxuICAgICAgICAgICAgXCJ5XCI6IC0xNTVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDIyMCxcbiAgICAgICAgICAgIFwieVwiOiA5NVxuICAgICAgICB9XG4gICAgXSxcbiAgICBcInN0ZXBzXCI6IDMsXG4gICAgXCJpbnRlcnNlY3Rpb25zXCI6IDYsXG4gICAgXCJhcmVhc1wiOiBbXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAtMzAwLFxuICAgICAgICBcIndcIjogNjAwLFxuICAgICAgICBcInlcIjogLTE2MCxcbiAgICAgICAgXCJoXCI6IDM0MCxcbiAgICAgICAgXCJ0eXBlXCI6IFwidG91Y2hcIlxuICAgICAgfVxuICAgIF0sXG4gICAgXCJidXR0b25zXCI6IFwiUiBaXCIsXG4gICAgXCJ3aW5kb3dzXCI6IHtcbiAgICAgIFwicnVcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwi0JrQvtCz0LTQsCDQv9C+0YDQsCDQstC+0LfQstGA0LDRidCw0YLRjNGB0Y8sINGB0YPQtNGM0LHQsCDQvdCw0LnQtNC10YIg0YHQv9C+0YHQvtCxINGC0LXQsdGPINCy0LXRgNC90YPRgtGMLiDigJQg0KHQsNGA0LAg0JTQttC40L4uINCk0LjQsNC70LrQuCDQsiDQvNCw0YDRgtC1XCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwibGFiZWxcIjogXCJJTkZPXCIsXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwi0KfRgtC+0LHRiyDQt9Cw0LzQutC90YPRgtGMINGC0L7Rh9C60Lgg0LvQuNC90LjQtdC5LCDQvdCw0LbQvNC40YLQtSBaXCJcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiZW5cIjogW1xuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwiRmF0ZSBoYXMgYSB3YXkgb2YgYnJpbmdpbmcgeW91IGJhY2sgd2hlbiBpdCdzIHRpbWUgdG8gY29tZSBiYWNrIOKAlCBTYXJhaCBKaW8uIFRoZSBWaW9sZXRzIG9mIE1hcmNoXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwibGFiZWxcIjogXCJJTkZPXCIsXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwiVG8gY2xvc2UgdGhlIGxpbmUgcG9pbnRzLCBwcmVzcyBaXCJcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH1cbiAgfSxcbiAge1xuICAgIFwibGFiZWxcIjogXCJCRUFSXCIsXG4gICAgXCJzdGVwc1wiOiAzLFxuICAgIFwiaW50ZXJzZWN0aW9uc1wiOiA2LFxuICAgIFwiY2xpY2tzXCI6IDUwLFxuICAgIFwiYnV0dG9uc1wiOiBcIlIgWlwiLFxuICAgIFwib2JqZWN0c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMTMwLFxuICAgICAgICAgICAgXCJ5XCI6IDcwLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogNDUsXG4gICAgICAgICAgICBcInlcIjogNDUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAyNDUsXG4gICAgICAgICAgICBcInlcIjogMTk1LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMjk1LFxuICAgICAgICAgICAgXCJ5XCI6IDcwLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTMwNSxcbiAgICAgICAgICAgIFwieVwiOiAtNTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiA3MCxcbiAgICAgICAgICAgIFwieVwiOiAxNzAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiaGludHNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMjQ1LFxuICAgICAgICAgICAgXCJ5XCI6IDIyMFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTMzMCxcbiAgICAgICAgICAgIFwieVwiOiAtMzBcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDcwLFxuICAgICAgICAgICAgXCJ5XCI6IDQ1XG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiYXJlYXNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTMzOSxcbiAgICAgICAgICAgIFwieVwiOiAtOTEsXG4gICAgICAgICAgICBcIndcIjogNjksXG4gICAgICAgICAgICBcImhcIjogNzAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ0b3VjaFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAxMCxcbiAgICAgICAgICAgIFwieVwiOiAxMSxcbiAgICAgICAgICAgIFwid1wiOiA3MSxcbiAgICAgICAgICAgIFwiaFwiOiA2OCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInRvdWNoXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDIxMixcbiAgICAgICAgICAgIFwieVwiOiAxNjMsXG4gICAgICAgICAgICBcIndcIjogNjcsXG4gICAgICAgICAgICBcImhcIjogNjYsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ0b3VjaFwiXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwiaGludFJVXCI6IG51bGwsXG4gICAgXCJoaW50VVNcIjogbnVsbCxcbiAgICBcIm5ld1wiOiB0cnVlXG4gIH0sXG4gIHtcbiAgICBcImxhYmVsXCI6IFwiQkFDS1dBUkRTXCIsXG4gICAgXCJjbGlja3NcIjogNTAsXG4gICAgXCJoaW50c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtODAsXG4gICAgICAgICAgICBcInlcIjogNzBcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC01LFxuICAgICAgICAgICAgXCJ5XCI6IC0xNTVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDk1LFxuICAgICAgICAgICAgXCJ5XCI6IC0xNTVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDQ1LFxuICAgICAgICAgICAgXCJ5XCI6IDEyMFxuICAgICAgICB9XG4gICAgXSxcbiAgICBcIm9iamVjdHNcIjogW1xuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxuICAgICAgICBcInhcIjogLTUwLFxuICAgICAgICBcInlcIjogMFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IDEwMCxcbiAgICAgICAgXCJ5XCI6IC0xMDBcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXG4gICAgICAgIFwieFwiOiA1MCxcbiAgICAgICAgXCJ5XCI6IDUwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxuICAgICAgICBcInhcIjogNTAsXG4gICAgICAgIFwieVwiOiAyNTBcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXG4gICAgICAgIFwieFwiOiAtMTUwLFxuICAgICAgICBcInlcIjogMjUwXG4gICAgICB9XG4gICAgXSxcbiAgICBcImFyZWFzXCI6IFtcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC0xMjUsXG4gICAgICAgIFwid1wiOiAzMjUsXG4gICAgICAgIFwieVwiOiAtMTYwLFxuICAgICAgICBcImhcIjogMzAwLFxuICAgICAgICBcInR5cGVcIjogXCJ0b3VjaFwiXG4gICAgICB9XG4gICAgXSxcbiAgICBcInN0ZXBzXCI6IDQsXG4gICAgXCJpbnRlcnNlY3Rpb25zXCI6IDUsXG4gICAgXCJidXR0b25zXCI6IFwiUiBaXCIsXG4gICAgXCJ3aW5kb3dzXCI6IHtcbiAgICAgIFwicnVcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwi0JzRiyDQvdC1INC+0YLRgdGC0YPQv9Cw0LXQvCDigJQg0LzRiyDQuNC00LXQvCDQsiDQtNGA0YPQs9C+0Lwg0L3QsNC/0YDQsNCy0LvQtdC90LjQuC4g4oCUINCU0YPQs9C70LDRgSDQnNCw0LrQsNGA0YLRg9GAXCJcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwiZW5cIjogW1xuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwiV2UgYXJlIG5vdCByZXRyZWF0aW5nIC0gd2UgYXJlIGdvaW5nIGluIHRoZSBvdGhlciBkaXJlY3Rpb24g4oCUIERvdWdsYXMgTWFjQXJ0aHVyXCJcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH1cbiAgfSxcbiAge1xuICAgIFwibGFiZWxcIjogXCJNQUxVTVwiLFxuICAgIFwiY2xpY2tzXCI6IDUsXG4gICAgXCJvYmplY3RzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC01LFxuICAgICAgICAgICAgXCJ5XCI6IC01LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogNDUsXG4gICAgICAgICAgICBcInlcIjogLTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC01NSxcbiAgICAgICAgICAgIFwieVwiOiAtNSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTUsXG4gICAgICAgICAgICBcInlcIjogLTU1LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtNSxcbiAgICAgICAgICAgIFwieVwiOiA0NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcImhpbnRzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC01NSxcbiAgICAgICAgICAgIFwieVwiOiA0NVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogNDUsXG4gICAgICAgICAgICBcInlcIjogLTU1XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtNTUsXG4gICAgICAgICAgICBcInlcIjogLTU1XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiA0NSxcbiAgICAgICAgICAgIFwieVwiOiA0NVxuICAgICAgICB9XG4gICAgXSxcbiAgICBcInN0ZXBzXCI6IDIsXG4gICAgXCJpbnRlcnNlY3Rpb25zXCI6IDEsXG4gICAgXCJidXR0b25zXCI6IFwiUiBaXCIsXG4gICAgXCJ3aW5kb3dzXCI6IHtcbiAgICAgIFwicnVcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwi0JzRiyDQt9Cw0LzQtdGH0LDQtdC8INC/0YDQtdC/0Y/RgtGB0YLQstC40Y8sINC60L7Qs9C00LAg0L7RgtGA0YvQstCw0LXQvCDQstC30LPQu9GP0LQg0L7RgiDRhtC10LvQuC4g4oCUINCU0LbQvtC30LXRhCDQmtC+0YHRgdC80LDQvVwiXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcImVuXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgIFwibGFiZWxcIjogXCJMSU5FU1wiLFxuICAgICAgICAgIFwidGV4dFwiOiBcIldlIG5vdGljZSB0aGUgb2JzdGFjbGVzLCB3aGVuIHdlIGRvIG5vdCBsb29rIGF0IHRoZSBnb2FsLiDigJQgSm9zZXBoIEtvc3NtYW5cIlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfVxuICB9LFxuICB7XG4gICAgXCJsYWJlbFwiOiBcIklJSVwiLFxuICAgIFwiY2xpY2tzXCI6IDMwLFxuICAgIFwib2JqZWN0c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMTU1LFxuICAgICAgICAgICAgXCJ5XCI6IDQ1LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTgwLFxuICAgICAgICAgICAgXCJ5XCI6IC0zMCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC01LFxuICAgICAgICAgICAgXCJ5XCI6IC0xMDUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiA3MCxcbiAgICAgICAgICAgIFwieVwiOiAtMzAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAxNDUsXG4gICAgICAgICAgICBcInlcIjogNDUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtNSxcbiAgICAgICAgICAgIFwieVwiOiAxNzAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtNSxcbiAgICAgICAgICAgIFwieVwiOiAtMzAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDcwLFxuICAgICAgICAgICAgXCJ5XCI6IDk1LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtODAsXG4gICAgICAgICAgICBcInlcIjogOTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC01LFxuICAgICAgICAgICAgXCJ5XCI6IDQ1LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiA3MCxcbiAgICAgICAgICAgIFwieVwiOiAtMTU1LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtODAsXG4gICAgICAgICAgICBcInlcIjogLTE1NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgICB9XG4gICAgXSxcbiAgICBcImhpbnRzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0yNTUsXG4gICAgICAgICAgICBcInlcIjogMTcwXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAyMCxcbiAgICAgICAgICAgIFwieVwiOiAtMTgwXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAxOTUsXG4gICAgICAgICAgICBcInlcIjogMTcwXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwic3RlcHNcIjogMyxcbiAgICBcImludGVyc2VjdGlvbnNcIjogNixcbiAgICBcImJ1dHRvbnNcIjogXCJSWlwiLFxuICAgIFwiYXJlYXNcIjogbnVsbFxuICB9LFxuICB7XG4gICAgXCJsYWJlbFwiOiBcIkVBWlk/XCIsXG4gICAgXCJvYmplY3RzXCI6IFtcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC00MyxcbiAgICAgICAgXCJ5XCI6IC00OCxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC00MixcbiAgICAgICAgXCJ5XCI6IC04LFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogLTQxLFxuICAgICAgICBcInlcIjogMjksXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAtNDAsXG4gICAgICAgIFwieVwiOiA3MCxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC0zOSxcbiAgICAgICAgXCJ5XCI6IDExMixcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC00NCxcbiAgICAgICAgXCJ5XCI6IC04MyxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC0xOSxcbiAgICAgICAgXCJ5XCI6IC0zOCxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC0yLFxuICAgICAgICBcInlcIjogLTcsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAxOCxcbiAgICAgICAgXCJ5XCI6IDIzLFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogNDAsXG4gICAgICAgIFwieVwiOiA1MSxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDU3LFxuICAgICAgICBcInlcIjogODYsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiA3OCxcbiAgICAgICAgXCJ5XCI6IDExNCxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDg0LFxuICAgICAgICBcInlcIjogODAsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiA4NixcbiAgICAgICAgXCJ5XCI6IDQ5LFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogODcsXG4gICAgICAgIFwieVwiOiAyMCxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDg3LFxuICAgICAgICBcInlcIjogLTEzLFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogODcsXG4gICAgICAgIFwieVwiOiAtNDcsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAxMzksXG4gICAgICAgIFwieVwiOiAtODQsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAxNzQsXG4gICAgICAgIFwieVwiOiAtODUsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAyMjAsXG4gICAgICAgIFwieVwiOiAtODUsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAxMjUsXG4gICAgICAgIFwieVwiOiAyLFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogMTYwLFxuICAgICAgICBcInlcIjogNSxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDE5OCxcbiAgICAgICAgXCJ5XCI6IDcsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAyMjcsXG4gICAgICAgIFwieVwiOiA3LFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogMTE1LFxuICAgICAgICBcInlcIjogMTA4LFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogMTU2LFxuICAgICAgICBcInlcIjogMTEyLFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogMjAxLFxuICAgICAgICBcInlcIjogMTEwLFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogMjM0LFxuICAgICAgICBcInlcIjogMTEzLFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogOTIsXG4gICAgICAgIFwieVwiOiAtODUsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAzOTQsXG4gICAgICAgIFwieVwiOiAtNTIsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAzNjQsXG4gICAgICAgIFwieVwiOiAtNzYsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAzMjAsXG4gICAgICAgIFwieVwiOiAtNjUsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAzMDUsXG4gICAgICAgIFwieVwiOiAtMjIsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAzMjUsXG4gICAgICAgIFwieVwiOiAxMyxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IDM2OSxcbiAgICAgICAgXCJ5XCI6IDM1LFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogMzkwLFxuICAgICAgICBcInlcIjogNzMsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAzNzEsXG4gICAgICAgIFwieVwiOiAxMTYsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAzMjksXG4gICAgICAgIFwieVwiOiAxMzEsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAyOTgsXG4gICAgICAgIFwieVwiOiAxMjMsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAtMjU3LFxuICAgICAgICBcInlcIjogLTkwLFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogLTI1NyxcbiAgICAgICAgXCJ5XCI6IC01NCxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC0yNTgsXG4gICAgICAgIFwieVwiOiAtMTMsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAtMjU3LFxuICAgICAgICBcInlcIjogMjQsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAtMjU5LFxuICAgICAgICBcInlcIjogNTUsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAtMjYwLFxuICAgICAgICBcInlcIjogMTAyLFxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogLTIxNCxcbiAgICAgICAgXCJ5XCI6IDEwNCxcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC0xNzMsXG4gICAgICAgIFwieVwiOiAxMDUsXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAtMTI4LFxuICAgICAgICBcInlcIjogNzIsXG4gICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ4XCI6IC0xMjgsXG4gICAgICAgIFwieVwiOiA0MSxcbiAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInhcIjogLTEyNyxcbiAgICAgICAgXCJ5XCI6IDEyLFxuICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAtMTI1LFxuICAgICAgICBcInlcIjogLTIxLFxuICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAtMTI0LFxuICAgICAgICBcInlcIjogLTU2LFxuICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAtMTIzLFxuICAgICAgICBcInlcIjogLTkxLFxuICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwieFwiOiAtMTMxLFxuICAgICAgICBcInlcIjogMTExLFxuICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgIH1cbiAgICBdLFxuICAgIFwiY2xpY2tzXCI6IDUwLFxuICAgIFwiaGludHNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogOTUsXG4gICAgICAgICAgICBcInlcIjogMTQ1XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAxMjAsXG4gICAgICAgICAgICBcInlcIjogLTEwNVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTE4MCxcbiAgICAgICAgICAgIFwieVwiOiAtMjMwXG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwic3RlcHNcIjogMyxcbiAgICBcImludGVyc2VjdGlvbnNcIjogMjAsXG4gICAgXCJidXR0b25zXCI6IFwiUlpcIixcbiAgICBcImFyZWFzXCI6IG51bGwsXG4gICAgXCJoaW50UlVcIjogbnVsbCxcbiAgICBcImhpbnRVU1wiOiBudWxsLFxuICAgIFwibmV3XCI6IHRydWVcbiAgfSxcbiAge1xuICAgIFwibGFiZWxcIjogXCJDSEFPU1wiLFxuICAgIFwiY2xpY2tzXCI6IDUwLFxuICAgIFwib2JqZWN0c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMjA1LFxuICAgICAgICAgICAgXCJ5XCI6IC0xNTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiA5NSxcbiAgICAgICAgICAgIFwieVwiOiAyMCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDE0NSxcbiAgICAgICAgICAgIFwieVwiOiAtODAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAyMjAsXG4gICAgICAgICAgICBcInlcIjogLTE1NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0zMCxcbiAgICAgICAgICAgIFwieVwiOiA0NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0zMCxcbiAgICAgICAgICAgIFwieVwiOiAtMTMwLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTEzMCxcbiAgICAgICAgICAgIFwieVwiOiAtMTU1LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTIzOSxcbiAgICAgICAgICAgIFwieVwiOiA5OCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDE5NSxcbiAgICAgICAgICAgIFwieVwiOiA5NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMTIwLFxuICAgICAgICAgICAgXCJ5XCI6IDE0NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTI4MCxcbiAgICAgICAgICAgIFwieVwiOiAyMCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTIwNSxcbiAgICAgICAgICAgIFwieVwiOiAxNzAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0xMzAsXG4gICAgICAgICAgICBcInlcIjogMTk1LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMjgwLFxuICAgICAgICAgICAgXCJ5XCI6IDE5NSxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTMwNCxcbiAgICAgICAgICAgIFwieVwiOiA3OCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTEwNSxcbiAgICAgICAgICAgIFwieVwiOiAxMjAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDk1LFxuICAgICAgICAgICAgXCJ5XCI6IC0xNTUsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDE3MCxcbiAgICAgICAgICAgIFwieVwiOiAtMjMwLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAyMCxcbiAgICAgICAgICAgIFwieVwiOiAtMjMwLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMTA1LFxuICAgICAgICAgICAgXCJ5XCI6IC0zMCxcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogLTIzMCxcbiAgICAgICAgICAgIFwieVwiOiAtODAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMjMwLFxuICAgICAgICAgICAgXCJ5XCI6IDIwLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAyNDUsXG4gICAgICAgICAgICBcInlcIjogLTU1LFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtNSxcbiAgICAgICAgICAgIFwieVwiOiAyNzAsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJoaW50c1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMzA1LFxuICAgICAgICAgICAgXCJ5XCI6IDEyMFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInhcIjogMTk1LFxuICAgICAgICAgICAgXCJ5XCI6IC01XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMzMwLFxuICAgICAgICAgICAgXCJ5XCI6IC0yMDVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0xMDUsXG4gICAgICAgICAgICBcInlcIjogNDVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDI5NSxcbiAgICAgICAgICAgIFwieVwiOiAtMjA1XG4gICAgICAgIH1cbiAgICBdLFxuICAgIFwic3RlcHNcIjogNSxcbiAgICBcImludGVyc2VjdGlvbnNcIjogOSxcbiAgICBcImJ1dHRvbnNcIjogXCJSWlwiLFxuICAgIFwiYXJlYXNcIjogbnVsbCxcbiAgICBcIndpbmRvd3NcIjoge1xuICAgICAgXCJydVwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcbiAgICAgICAgICBcInRleHRcIjogXCLQltC40LfQvdGMIOKAlCDRjdGC0L4g0L/RgNC10LbQtNC1INCy0YHQtdCz0L4g0YXQsNC+0YEsINCyINC60L7RgtC+0YDQvtC8INGC0Ysg0LfQsNGC0LXRgNGP0L0uINCl0L7RgdC1INCe0YDRgtC10LPQsC3QuC3Qk9Cw0YHRgdC10YJcIlxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJlblwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcbiAgICAgICAgICBcInRleHRcIjogXCJMaWZlIC0gaXMgZmlyc3Qgb2YgYWxsIHRoZSBjaGFvcywgaW4gd2hpY2ggeW91IGxvc3QuIEpvc9C1IE9ydGVnYSB5IEdhc3NldFwiXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgfVxuICB9LFxuICB7XG4gICAgXCJsYWJlbFwiOiBcIklNUEVESU1FTlRBXCIsXG4gICAgXCJvYmplY3RzXCI6IFtcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IC05MCxcbiAgICAgICAgXCJ5XCI6IC03MFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IDkwLFxuICAgICAgICBcInlcIjogLTcwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCIsXG4gICAgICAgIFwieFwiOiA1NSxcbiAgICAgICAgXCJ5XCI6IC0zMFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiLFxuICAgICAgICBcInhcIjogLTU1LFxuICAgICAgICBcInlcIjogLTMwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxuICAgICAgICBcInhcIjogNTUsXG4gICAgICAgIFwieVwiOiAzMFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IC01NSxcbiAgICAgICAgXCJ5XCI6IDMwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxuICAgICAgICBcInhcIjogOTAsXG4gICAgICAgIFwieVwiOiA3MFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IC05MCxcbiAgICAgICAgXCJ5XCI6IDcwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCIsXG4gICAgICAgIFwieFwiOiAtMTc1LFxuICAgICAgICBcInlcIjogNDBcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIixcbiAgICAgICAgXCJ4XCI6IDE3NSxcbiAgICAgICAgXCJ5XCI6IDQwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCIsXG4gICAgICAgIFwieFwiOiA1NSxcbiAgICAgICAgXCJ5XCI6IDIwMFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiLFxuICAgICAgICBcInhcIjogLTU1LFxuICAgICAgICBcInlcIjogMjAwXG4gICAgICB9XG4gICAgXSxcbiAgICBcImNsaWNrc1wiOiA1MCxcbiAgICBcImhpbnRzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IC0yMzAsXG4gICAgICAgICAgICBcInlcIjogLTgwXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAtMjA1LFxuICAgICAgICAgICAgXCJ5XCI6IDk1XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwieFwiOiAyMjAsXG4gICAgICAgICAgICBcInlcIjogOTVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ4XCI6IDI0NSxcbiAgICAgICAgICAgIFwieVwiOiAtODBcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJzdGVwc1wiOiA0LFxuICAgIFwiaW50ZXJzZWN0aW9uc1wiOiA2LFxuICAgIFwiYnV0dG9uc1wiOiBcIlIgWlwiLFxuXG4gICAgXCJ3aW5kb3dzXCI6IHtcbiAgICAgIFwicnVcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwi0J3QtSDRgtGA0LDRgtGM0YLQtSDQstGA0LXQvNGPINCyINC/0L7QuNGB0LrQtSDQv9GA0LXQv9GP0YLRgdGC0LLQuNC5OiDQuNGFINC80L7QttC10YIg0Lgg0L3QtSDRgdGD0YnQtdGB0YLQstC+0LLQsNGC0YwuIOKAlCDQpNGA0LDQvdGGINCa0LDRhNC60LBcIlxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJlblwiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcbiAgICAgICAgICBcInRleHRcIjogXCJEbyBub3Qgd2FzdGUgeW91ciB0aW1lIHNlYXJjaGluZyBmb3Igb2JzdGFjbGVzOiB0aGV5IG1heSBkb2VzIG5vdCBleGlzdC4g4oCUIEZyYW56IEthZmthXCJcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH1cbiAgfVxuXSIsImNsYXNzIEFqYXhSZXF1ZXN0cyB7XG5cdGNvbnN0cnVjdG9yKGdhbWUsIHJlcG9zaXRvcnkpIHtcblx0XHR0aGlzLmdhbWUgPSBnYW1lO1xuXHRcdHRoaXMucmVwb3NpdG9yeSA9IHJlcG9zaXRvcnk7XG5cblx0XHR0aGlzLnRyYW5zbGF0ZXMgPSB7XG5cdFx0XHRhc2s6IHtcblx0XHRcdFx0cnU6IHtcblx0XHRcdFx0XHRsYWJlbDogJ0lORk8nLFxuXHRcdFx0XHRcdHRleHQ6ICfQl9Cw0LPRgNGD0LfQuNGC0Ywg0L3QvtCy0YvQtSDRg9GA0L7QstC90Lg/J1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRlbjoge1xuXHRcdFx0XHRcdGxhYmVsOiAnSU5GTycsXG5cdFx0XHRcdFx0dGV4dDogJ0Rvd25sb2FkIG5ldyBsZXZlbHM/J1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0bm9OZXdMZXZlbHM6IHtcblx0XHRcdFx0cnU6IHtcblx0XHRcdFx0XHRsYWJlbDogJ0lORk8nLFxuXHRcdFx0XHRcdHRleHQ6ICfQktGLINC/0YDQvtGI0LvQuCDQstGB0LUg0LPQvtC70L7QstC+0LvQvtC80LrQuCDQsiDQuNCz0YDQtS4g0J7QttC40LTQsNC50YLQtSDQvdC+0LLRi9GFINGD0YDQvtCy0L3QtdC5INC60LDQttC00YPRjiDQvdC10LTQtdC70Y4hJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRlbjoge1xuXHRcdFx0XHRcdGxhYmVsOiAnSU5GTycsXG5cdFx0XHRcdFx0dGV4dDogJ1lvdSBwYXNzZWQgYWxsIHRoZSBwdXp6bGVzIGluIHRoZSBnYW1lLiBFeHBlY3QgbmV3IGxldmVscyBldmVyeSB3ZWVrISdcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGZhaWxMb2FkTmV3TGV2ZWxzOiB7XG5cdFx0XHRcdHJ1OiB7XG5cdFx0XHRcdFx0bGFiZWw6ICdJTkZPJyxcblx0XHRcdFx0XHR0ZXh0OiAn0J7RgtGB0YPRgtGB0YLQstGD0LXRgiDRgdC+0LXQtNC40L3QtdC90LjQtSDRgSDRgdC10YDQstC10YDQvtC8Lidcblx0XHRcdFx0fSxcblx0XHRcdFx0ZW46IHtcblx0XHRcdFx0XHRsYWJlbDogJ0lORk8nLFxuXHRcdFx0XHRcdHRleHQ6ICdObyBjb25uZWN0aW9uIHRvIHRoZSBzZXJ2ZXIuJ1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH1cblx0fVxuXHRyZXF1ZXN0TmV3TGV2ZWxzKCkge1xuXHRcdHZhciB1cmwgPSBgJHt0aGlzLnJlcG9zaXRvcnl9L2xldmVscyR7dGhpcy5nYW1lLnBsYXkuY3VycmVudExldmVsKzF9Lmpzb25gO1xuXG5cdFx0dGhpcy5nYW1lLndpbmRvd01hbmFnZXIuYWRkV2luZG93KHRoaXMudHJhbnNsYXRlcy5hc2tbdGhpcy5nYW1lLnNldHRpbmdzLmxhbmddLCAoKSA9PiB7XG5cdFx0XHQkLmdldEpTT04odXJsKVxuXHRcdFx0XHQuZG9uZSgoZGF0YSkgPT4ge1xuXHRcdFx0XHRcdHRoaXMuZ2FtZS5wbGF5LmxldmVscyA9IHRoaXMuZ2FtZS5wbGF5LmxldmVscy5jb25jYXQoZGF0YSk7XG5cdFx0XHRcdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2xldmVscycsIEpTT04uc3RyaW5naWZ5KHRoaXMuZ2FtZS5wbGF5LmxldmVscykpO1xuXHRcdFx0XHRcdHRoaXMuZ2FtZS5wbGF5LmxvYWRMZXZlbCh0aGlzLmdhbWUucGxheS5jdXJyZW50TGV2ZWwgKyAxKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0LmZhaWwoKGVycikgPT4ge1xuXHRcdFx0XHRcdHZhciBjb25maWc7XG5cblx0XHRcdFx0XHRpZiAoZXJyLnN0YXR1cyA9PT0gNDA0KSBjb25maWcgPSB0aGlzLnRyYW5zbGF0ZXMubm9OZXdMZXZlbHNbdGhpcy5nYW1lLnNldHRpbmdzLmxhbmddO1xuXHRcdFx0XHRcdGVsc2UgY29uZmlnID0gdGhpcy50cmFuc2xhdGVzLmZhaWxMb2FkTmV3TGV2ZWxzW3RoaXMuZ2FtZS5zZXR0aW5ncy5sYW5nXTtcblxuXHRcdFx0XHRcdHRoaXMuZ2FtZS53aW5kb3dNYW5hZ2VyLmFkZFdpbmRvdyhjb25maWcsICgpID0+IHtcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4gdGhpcy5nYW1lLm5hdmlnYXRpb24udG9NZW51KCksIDMwMCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQWpheFJlcXVlc3RzOyIsImNsYXNzIE5hdmlnYXRpb24ge1xuXHRjb25zdHJ1Y3RvcihnYW1lKSB7XG5cdFx0dGhpcy5nYW1lID0gZ2FtZTtcblxuXHRcdHRoaXMuX2JpbmRFdmVudHMoKTtcblx0fVxuXHRfYmluZEV2ZW50cygpIHtcblx0XHQvLyBDb3Jkb3ZhIEFQSVxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3BhdXNlJywgdGhpcy5wYXVzZS5iaW5kKHRoaXMpLCBmYWxzZSk7XG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncmVzdW1lJywgdGhpcy5yZXN1bWUuYmluZCh0aGlzKSwgZmFsc2UpO1xuXHR9XG5cblx0dG9NZW51KCkge1xuXHRcdHRoaXMuZ2FtZS5zcGxhc2guc2hvdygpO1xuXHRcdHRoaXMuZ2FtZS5tZW51LnNjZW5lLnNob3coKTtcblx0XHR0aGlzLmdhbWUuaW50ZXJmYWNlLnNjZW5lLmhpZGUoKTtcblx0XHR0aGlzLmdhbWUucGxheS5zY2VuZS5oaWRlKCk7XG5cdFx0dGhpcy5nYW1lLnNldHRpbmdzLnNjZW5lLmhpZGUoKTtcblx0fVxuXG5cdHRvU2V0dGluZ3MoKSB7XG5cdFx0dGhpcy5nYW1lLnNwbGFzaC5zaG93KCk7XG5cdFx0dGhpcy5nYW1lLnNldHRpbmdzLnNjZW5lLnNob3coKTtcblx0XHR0aGlzLmdhbWUubWVudS5zY2VuZS5oaWRlKCk7XG5cdFx0dGhpcy5nYW1lLmludGVyZmFjZS5zY2VuZS5oaWRlKCk7XG5cdFx0dGhpcy5nYW1lLnBsYXkuc2NlbmUuaGlkZSgpO1xuXHR9XG5cblx0dG9QbGF5KCkge1xuXHRcdHRoaXMuZ2FtZS5zcGxhc2guc2hvdygpO1xuXHRcdHRoaXMuZ2FtZS5wbGF5LnNjZW5lLnNob3coKTtcblx0XHR0aGlzLmdhbWUuaW50ZXJmYWNlLnNjZW5lLnNob3coKTtcblx0XHR0aGlzLmdhbWUuc2V0dGluZ3Muc2NlbmUuaGlkZSgpO1xuXHRcdHRoaXMuZ2FtZS5tZW51LnNjZW5lLmhpZGUoKTtcblxuXHRcdHRoaXMuZ2FtZS5wbGF5LmxvYWRMZXZlbCgrbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2N1cnJlbnRMZXZlbCcpKTtcblx0fVxuXG5cdHBhdXNlKCkge1xuXHRcdHRoaXMuZ2FtZS5tdXNpYy5zdG9wKCk7XG5cdFx0dGhpcy5nYW1lLmVmZmVjdC50b2dnbGUoZmFsc2UpO1xuXHR9XG5cblx0cmVzdW1lKCkge1xuXHRcdHRoaXMuZ2FtZS5zZXR0aW5ncy5pc011c2ljICYmIHRoaXMuZ2FtZS5tdXNpYy5wbGF5KCk7XG5cdFx0dGhpcy5nYW1lLmVmZmVjdC50b2dnbGUodHJ1ZSk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBOYXZpZ2F0aW9uO1xuIiwiY2xhc3MgV2luZG93TWFuYWdlciB7XG5cdGNvbnN0cnVjdG9yKGdhbWUpIHtcblx0XHR0aGlzLmdhbWUgPSBnYW1lO1xuXG5cdFx0dGhpcy5jbG9zaW5nU3BlZWQgPSAzMDA7XG5cdFx0dGhpcy5pc0Nsb3NpbmcgPSBmYWxzZTtcblxuXHRcdHRoaXMud2luZG93ID0gJCgnI3dpbmRvdycpO1xuXHRcdHRoaXMuY29udGVudCA9ICQoJyNjb250ZW50Jyk7XG5cdFx0dGhpcy5sYWJlbCA9IHRoaXMud2luZG93LmZpbmQoJ2gxJyk7XG5cdFx0dGhpcy50ZXh0ID0gdGhpcy53aW5kb3cuZmluZCgncCcpO1xuXHRcdHRoaXMuYnV0dG9uID0gdGhpcy53aW5kb3cuZmluZCgnYnV0dG9uJyk7XG5cblx0XHQvLyBjYWxsYmFja1xuXHRcdHRoaXMub247XG5cblx0XHR0aGlzLl9iaW5kRXZlbnRzKCk7XG5cdFx0dGhpcy5jbG9zZSgpO1xuXHR9XG5cdF9iaW5kRXZlbnRzKCkge1xuXHRcdHRoaXMuYnV0dG9uLm9uKCdjbGljaycsICgoKSA9PiB7XG5cdFx0XHR0aGlzLndpbmRvdy5mYWRlT3V0KCgpID0+IHRoaXMuY2xvc2UoKSk7XG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHRoaXMub24gJiYgdGhpcy5vbigpLCAxMDAwKTtcblx0XHR9KSk7XG5cdH1cblx0YWRkV2luZG93KGNvbmZpZywgY2IpIHtcblx0XHR0aGlzLmxhYmVsLmh0bWwoY29uZmlnLmxhYmVsKTtcblx0XHR0aGlzLnRleHQuaHRtbChjb25maWcudGV4dCk7XG5cdFx0dGhpcy5vbiA9IGNiO1xuXG5cdFx0dGhpcy5vcGVuKCk7XG5cdH1cblx0b3BlbigpIHtcblx0XHR0aGlzLndpbmRvdy5zaG93KCk7XG5cdH1cblx0Y2xvc2UoKSB7XG5cdFx0dGhpcy53aW5kb3cuaGlkZSgpO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gV2luZG93TWFuYWdlcjtcbiIsInZhciBhZHMgPSB7XG5cdGluaXQ6IGZ1bmN0aW9uKGdhbWUpIHtcblx0XHRhZHMuZ2FtZSA9IGdhbWU7XG5cdFx0YWRzLmlzTG9hZCA9IGZhbHNlO1xuXHRcdGlmKCF3aW5kb3cuQ29jb29uIHx8IGdhbWUuZWRpdGlvbiA9PT0gJ1BBSUQnKSByZXR1cm47XG5cblx0XHRhZHMuaW50ZXJzdGl0aWFsID0gQ29jb29uLkFkLkFkTW9iLmNyZWF0ZUludGVyc3RpdGlhbChcImFkIG1vYiBrZXlcIik7XG5cblx0XHRhZHMuaW50ZXJzdGl0aWFsLm9uKFwibG9hZFwiLCBmdW5jdGlvbigpIHtcblx0XHRcdGFkcy5pc0xvYWQgPSB0cnVlO1xuXHRcdH0pO1xuXHR9LFxuXHRsb2FkKCkge1xuXHRcdGlmKHdpbmRvdy5Db2Nvb24gJiYgYWRzLmdhbWUuZWRpdGlvbiA9PT0gJ0ZSRUUnKSB7XG5cdFx0XHRhZHMuaW50ZXJzdGl0aWFsLmxvYWQoKTtcblx0XHRcdGFkcy5pc0xvYWQgPSBmYWxzZTtcblx0XHR9XG5cdH0sXG5cdHNob3coKSB7XG5cdFx0aWYod2luZG93LkNvY29vbiAmJiBhZHMuZ2FtZS5lZGl0aW9uID09PSAnRlJFRScpIHtcblx0XHRcdGFkcy5pbnRlcnN0aXRpYWwuc2hvdygpO1xuXHRcdH1cblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFkcztcbiIsInZhciBoZWxwZXIgPSB7XG5cdGdldEhlaWdodFRyaWFuZ2xlKHgsIHksIHgyLCB5MiwgeDMsIHkzKSB7XG5cdFx0Ly/QtNC70LjQvdGLINGB0YLQvtGA0L7QvSDRgtGA0LXRg9Cz0L7Qu9GM0L3QuNC60LBcblx0XHR2YXIgQUMgPSBoZWxwZXIuZ2V0RGlzdGFuY2UoeCwgeSwgeDMsIHkzKTtcblx0XHR2YXIgQkMgPSBoZWxwZXIuZ2V0RGlzdGFuY2UoeDIsIHkyLCB4MywgeTMpO1xuXHRcdHZhciBBQiA9IGhlbHBlci5nZXREaXN0YW5jZSh4LCB5LCB4MiwgeTIpO1xuXG5cdFx0Ly/Qv9C+0LvRg9C/0LXRgNC40LzQtdGC0YBcblx0XHR2YXIgcCA9IChBQytCQytBQikvMjtcblxuXHRcdC8v0KTQvtGA0LzRg9C70LAg0LTQu9C40L3RiyDQstGL0YHQvtGC0Ysg0YEg0L/QvtC80L7RidGM0Y4g0YHRgtC+0YDQvtC9INGC0YDQtdGD0LPQvtC70YzQvdC40LrQsFxuXHRcdHZhciBoID0gKDIvQUIpKk1hdGguc3FydChwKihwLUFCKSoocC1BQykqKHAtQkMpKTtcblxuXHRcdHJldHVybiBoO1xuXHR9LFxuXHRnZXREaXN0YW5jZSh4LCB5LCB4MiwgeTIpIHtcblx0XHQvL9C00LvQuNC90Ysg0YHRgtC+0YDQvtC9INGC0YDQtdGD0LPQvtC70YzQvdC40LrQsFxuXHRcdHJldHVybiBNYXRoLnNxcnQoTWF0aC5wb3coeDIteCwgMikgKyBNYXRoLnBvdyh5Mi15LCAyKSk7XG5cdH0sXG5cdGdldGxvbmfQoW9vcmRzTGluZSh4LCB5LCB4MiwgeTIsIG4pIHtcblx0XHR2YXIgbG9uZ1ggPSB4MiAtIHg7XG5cdFx0dmFyIGxvbmdZID0geTIgLSB5O1xuXHRcdFxuXHRcdHJldHVybiB7eDogeDIrbG9uZ1gqbiwgeTogeTIrbG9uZ1kqbn07XG5cdH0sXG5cdGlzQ29udGFpbnMocngsIHJ5LCBydywgcmgsIHgsIHkpIHtcblx0XHRyZXR1cm4geCA+PSByeCAmJiB4IDw9IHJ4K3J3ICYmIHkgPj0gcnkgJiYgeSA8PSByeStyaDtcblx0fSxcblx0aW50UmFuZFJhbmdlKG1pbiwgbWF4KSB7XG5cdCAgXHRyZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcblx0fSxcblx0ZmxvYXRSYW5kUmFuZ2UobWluLCBtYXgpIHtcblx0ICBcdHJldHVybiArKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbikudG9GaXhlZCgxKTtcblx0fSxcblx0aW5SYW5nZUFycmF5KHZhbHVlLCBhcnIpIHtcblx0XHRpZih2YWx1ZSA+IGFyci5sZW5ndGgtMSkgcmV0dXJuIDA7XG5cdFx0ZWxzZSBpZih2YWx1ZSA8IDApIHJldHVybiBhcnIubGVuZ3RoLTE7XG5cdFx0ZWxzZSByZXR1cm4gdmFsdWU7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gaGVscGVyOyIsInZhciBub3RpZmljYXRpb25zID0gZnVuY3Rpb24oZ2FtZSkge1xuXHRpZighd2luZG93LnBsdWdpbnMgfHwgIXdpbmRvdy5wbHVnaW5zLk9uZVNpZ25hbCkgcmV0dXJuO1xuXG5cdHZhciBub3RpZmljYXRpb25PcGVuZWRDYWxsYmFjayA9IGZ1bmN0aW9uKGpzb25EYXRhKSB7XG5cdFx0Y29uc29sZS5sb2coJ25vdGlmaWNhdGlvbk9wZW5lZENhbGxiYWNrOiAnICsgSlNPTi5zdHJpbmdpZnkoanNvbkRhdGEpKTtcblx0fTtcblxuXHR3aW5kb3cucGx1Z2lucy5PbmVTaWduYWxcblx0XHQuc3RhcnRJbml0KFwiT25lU2lnbmFsIGtleVwiLCBcImdvb2dsZVBsYXkgaWRcIilcblx0XHQuaGFuZGxlTm90aWZpY2F0aW9uT3BlbmVkKG5vdGlmaWNhdGlvbk9wZW5lZENhbGxiYWNrKVxuXHRcdC5lbmRJbml0KCk7XG5cblx0d2luZG93LnBsdWdpbnMuT25lU2lnbmFsLnNlbmRUYWcoJ2VkaXRpb24nLCBnYW1lLmVkaXRpb24pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5vdGlmaWNhdGlvbnM7IiwiY29uc3QgaGVscGVyID0gcmVxdWlyZSgnLi4vbWl4aW5zL2hlbHBlcicpO1xuXG5jbGFzcyBDYW52YXNFZmZlY3Qge1xuXHRjb25zdHJ1Y3RvcihnYW1lLCBjb25maWcpIHtcblx0XHR0aGlzLmdhbWUgPSBnYW1lO1xuXG5cdFx0dGhpcy5zY2VuZSA9ICQoJyNlZmZlY3QnKTtcblx0XHR0aGlzLnNjZW5lWzBdLndpZHRoID0gdGhpcy5nYW1lLnc7XG5cdFx0dGhpcy5zY2VuZVswXS5oZWlnaHQgPSB0aGlzLmdhbWUuaDtcblxuXHRcdHRoaXMuY3R4ID0gdGhpcy5zY2VuZVswXS5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdHRoaXMuaXNSZW5kZXJHcmFwaHkgPSB0cnVlO1xuXG5cdFx0dGhpcy5wYXJ0aWNsZXMgPSBbXTtcblxuXHRcdHRoaXMuaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcblx0XHR0aGlzLmltYWdlLm9ubG9hZCA9ICgpID0+IHtcblx0XHRcdHRoaXMuY3JlYXRlUGFydGljbGVzKGNvbmZpZy5wYXJ0aWNsZXMsIGNvbmZpZy5jb25maWcpO1xuXHRcdFx0dGhpcy5sb29wKCk7XG5cdFx0fVxuXHRcdHRoaXMuaW1hZ2Uuc3JjID0gY29uZmlnLmltYWdlO1xuXHR9XG5cdHRvZ2dsZShib29sKSB7XG5cdFx0dGhpcy5pc1JlbmRlckdyYXBoeSA9IGJvb2w7XG5cdFx0Ym9vbCA/IHRoaXMuc2NlbmUuc2hvdygpIDogdGhpcy5zY2VuZS5oaWRlKCk7XG5cdFx0Ym9vbCAmJiB0aGlzLmxvb3AoKTtcblx0fVxuXHRyZXNpemUoKSB7XG5cdFx0dGhpcy5zY2VuZVswXS53aWR0aCA9IHRoaXMuZ2FtZS53O1xuXHRcdHRoaXMuc2NlbmVbMF0uaGVpZ2h0ID0gdGhpcy5nYW1lLmg7XHRcdFxuXHR9XG5cblx0bG9vcCgpIHtcblx0XHRpZighdGhpcy5pc1JlbmRlckdyYXBoeSkgcmV0dXJuO1xuXG5cdFx0dGhpcy51cGRhdGUoKTtcblx0XHR0aGlzLmRyYXcoKTtcblxuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLmxvb3AuYmluZCh0aGlzKSk7XG5cdH1cblx0dXBkYXRlKCkge1xuXHRcdGZvcihsZXQgcCBvZiB0aGlzLnBhcnRpY2xlcykge1xuXHRcdFx0cC51cGRhdGUoKTtcblx0XHR9XG5cdH1cblxuXHRkcmF3KCkge1xuXHRcdHRoaXMuY2xlYXJTY3JlZW4oKTtcblxuXHRcdGZvcihsZXQgcCBvZiB0aGlzLnBhcnRpY2xlcykge1xuXHRcdFx0cC5kcmF3KCk7XG5cdFx0fVxuXHR9XG5cdGNsZWFyU2NyZWVuKCkge1xuXHRcdHRoaXMuY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmdhbWUudywgdGhpcy5nYW1lLmgpO1xuXHR9XG5cblx0Y3JlYXRlUGFydGljbGVzKGNvdW50LCBjb25maWcpIHtcblx0XHRmb3IobGV0IGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuXHRcdFx0dGhpcy5wYXJ0aWNsZXMucHVzaChuZXcgUGFydGljbGUodGhpcywge1xuXHRcdFx0XHRyOiAgICAgaGVscGVyLmludFJhbmRSYW5nZShjb25maWcuclswXSwgY29uZmlnLnJbMV0pLFxuXHRcdFx0XHR4OiAgICAgaGVscGVyLmludFJhbmRSYW5nZShjb25maWcueFswXSwgY29uZmlnLnhbMV0pLFxuXHRcdFx0XHR5OiAgICAgaGVscGVyLmludFJhbmRSYW5nZShjb25maWcueVswXSwgY29uZmlnLnlbMV0pLFxuXHRcdFx0XHR2ZWNYOiAgaGVscGVyLmludFJhbmRSYW5nZShjb25maWcudmVjWFswXSwgY29uZmlnLnZlY1lbMV0pLFxuXHRcdFx0XHR2ZWNZOiAgaGVscGVyLmludFJhbmRSYW5nZShjb25maWcudmVjWVswXSwgY29uZmlnLnZlY1lbMV0pLFxuXHRcdFx0XHRhbHBoYTogaGVscGVyLmZsb2F0UmFuZFJhbmdlKGNvbmZpZy5hbHBoYVswXSwgY29uZmlnLmFscGhhWzFdKVxuXHRcdFx0fSkpO1xuXHRcdH1cblx0fVxufVxuXG5jbGFzcyBQYXJ0aWNsZSB7XG5cdGNvbnN0cnVjdG9yKGVmZmVjdCwgcHJvcCkge1xuXHRcdHRoaXMuZWZmZWN0ID0gZWZmZWN0O1xuXHRcdHRoaXMuZ2FtZSA9IHRoaXMuZWZmZWN0LmdhbWU7XG5cblx0XHR0aGlzLnIgPSBwcm9wLnIgfHwgMTA7XG5cdFx0dGhpcy54ID0gcHJvcC54IHx8IDA7XG5cdFx0dGhpcy55ID0gcHJvcC55IHx8IDA7XG5cdFx0dGhpcy52ZWNYID0gcHJvcC52ZWNYIHx8IDE7XG5cdFx0dGhpcy52ZWNZID0gcHJvcC52ZWNZIHx8IDE7XG5cdFx0dGhpcy5hbHBoYSA9IHByb3AuYWxwaGEgfHwgMTtcblx0fVxuXG5cdHVwZGF0ZSgpIHtcblx0XHRpZih0aGlzLnggKyB0aGlzLnIgPCAwKSB7XG5cdFx0XHR0aGlzLnggPSB0aGlzLmdhbWUudyt0aGlzLnI7XG5cdFx0XHR0aGlzLnZlY1kgPSBoZWxwZXIuaW50UmFuZFJhbmdlKC10aGlzLnZlY1ksIHRoaXMudmVjWSk7XG5cblx0XHR9IGVsc2UgaWYodGhpcy54IC0gdGhpcy5yID4gdGhpcy5nYW1lLncpIHtcblx0XHRcdHRoaXMueCA9IC10aGlzLnI7XG5cdFx0XHR0aGlzLnZlY1kgPSBoZWxwZXIuaW50UmFuZFJhbmdlKC10aGlzLnZlY1ksIHRoaXMudmVjWSk7XG5cblx0XHR9IGlmKHRoaXMueSArIHRoaXMuciA8IDApIHtcblx0XHRcdHRoaXMueSA9IHRoaXMuZ2FtZS5oK3RoaXMucjtcblx0XHRcdHRoaXMudmVjWCA9IGhlbHBlci5pbnRSYW5kUmFuZ2UoLXRoaXMudmVjWCwgdGhpcy52ZWNYKTtcblxuXHRcdH0gZWxzZSBpZih0aGlzLnkgLSB0aGlzLnIgPiB0aGlzLmdhbWUuaCkge1xuXHRcdFx0dGhpcy55ID0gLXRoaXMucjtcblx0XHRcdHRoaXMudmVjWCA9IGhlbHBlci5pbnRSYW5kUmFuZ2UoLXRoaXMudmVjWCwgdGhpcy52ZWNYKTtcblx0XHR9XG5cblx0XHR0aGlzLnggKz0gdGhpcy52ZWNYO1xuXHRcdHRoaXMueSArPSB0aGlzLnZlY1k7XG5cdH1cblx0ZHJhdygpIHtcblx0XHR0aGlzLmVmZmVjdC5jdHguZ2xvYmFsQWxwaGEgPSB0aGlzLmFscGhhO1xuXHRcdHRoaXMuZWZmZWN0LmN0eC5kcmF3SW1hZ2UoXG5cdFx0XHR0aGlzLmVmZmVjdC5pbWFnZSxcblx0XHRcdHRoaXMueC10aGlzLnIsXG5cdFx0XHR0aGlzLnktdGhpcy5yLCBcblx0XHRcdHRoaXMucioyLCBcblx0XHRcdHRoaXMucioyXG5cdFx0KTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENhbnZhc0VmZmVjdDsiLCJ2YXIgaGVscGVyID0gcmVxdWlyZSgnLi4vbWl4aW5zL2hlbHBlcicpO1xuXG5jbGFzcyBJbnRlcmZhY2Uge1xuXHRjb25zdHJ1Y3RvcihnYW1lKSB7XG5cdFx0dGhpcy5nYW1lID0gZ2FtZTtcblxuXHRcdHRoaXMuc2NlbmUgPSAkKCcjaW50ZXJmYWNlJyk7XG5cblx0XHR0aGlzLmxhYmVsID0gJCgnI2xhYmVsJyk7XG5cdFx0dGhpcy5zdGVwcyA9ICQoJyNzdGVwcycpO1xuXHRcdHRoaXMuaW50ZXJzZWN0aW9ucyA9ICQoJyNpbnRlcnNlY3Rpb25zJyk7XG5cdFx0XG5cdFx0dGhpcy5yZXN0YXJ0ID0gJCgnI3Jlc3RhcnQnKTtcblx0XHR0aGlzLmhpbnQgPSAkKCcjaGludCcpO1xuXHRcdHRoaXMuY2xvc2VQYXRoID0gJCgnI2Nsb3NlUGF0aCcpO1xuXG5cdFx0dGhpcy5fYmluZEV2ZW50cygpO1xuXHR9XG5cblx0X2JpbmRFdmVudHMoKSB7XG5cdFx0dGhpcy5yZXN0YXJ0Lm9uKCdjbGljaycsICgpID0+IHtcblx0XHRcdHRoaXMuZ2FtZS5yZXN0YXJ0Q2xpY2tzKys7XG5cdFx0XHRpZih0aGlzLmdhbWUucmVzdGFydENsaWNrcyA+IDIwKSB7XG5cdFx0XHRcdHRoaXMuZ2FtZS5hZHMuc2hvdygpO1xuXHRcdFx0XHR0aGlzLmdhbWUucmVzdGFydENsaWNrcyA9IDA7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2FtZS5wbGF5LnJlc3RhcnRMZXZlbCgpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5jbG9zZVBhdGgub24oJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0dGhpcy5nYW1lLnBsYXkubGV2ZWwuY2xvc2VQYXRoKCk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmhpbnQub24oJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0aWYoTWF0aC5yb3VuZCh0aGlzLmdhbWUucGxheS5sZXZlbC5jbGlja3MvdGhpcy5nYW1lLnBsYXkubGV2ZWwuY29uZmlnLmNsaWNrcykgPiB0aGlzLmdhbWUucGxheS5sZXZlbC5jdXJyZW50SGludCkge1xuXHRcdFx0XHR0aGlzLmdhbWUuYWRzLnNob3coKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5nYW1lLnBsYXkubGV2ZWwuc2hvd0hpbnQoKTtcblx0XHR9KTtcblx0fVxuXG5cdHNlbGVjdEJ1dHRvbnMoY29uZmlnKSB7XG5cdFx0Zm9yKGxldCBrZXkgaW4gY29uZmlnKVxuXHRcdFx0dGhpc1trZXldICYmIGNvbmZpZ1trZXldID8gdGhpc1trZXldLnNob3coKSA6IHRoaXNba2V5XS5oaWRlKCk7XG5cdH1cblxuXHR1cGRhdGVHYW1lSW5mbygpIHtcblx0XHR0aGlzLmludGVyc2VjdGlvbnMuaHRtbCgnSU5URVJTRUNUSU9OUyAnICsgdGhpcy5nYW1lLnBsYXkubGV2ZWwuaW50ZXJzZWN0aW9uc0xlZnQpO1xuXHRcdHRoaXMuc3RlcHMuaHRtbCgnU1RFUFMgJyArIHRoaXMuZ2FtZS5wbGF5LmxldmVsLnN0ZXBzTGVmdCk7XG5cdFx0dGhpcy5sYWJlbC5odG1sKHRoaXMuZ2FtZS5wbGF5LmxldmVsLmxhYmVsKTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEludGVyZmFjZTsiLCJjbGFzcyBNZW51IHtcblx0Y29uc3RydWN0b3IoZ2FtZSkge1xuXHRcdHRoaXMuZ2FtZSA9IGdhbWU7XG5cblx0XHR0aGlzLnNjZW5lID0gJCgnI21lbnUnKTtcblxuXHRcdHRoaXMuc3RhcnQgPSAkKCcuc3RhcnQnKTtcblx0XHR0aGlzLnNldHVwID0gJCgnLnNldHVwJyk7XG5cdFx0dGhpcy5leGl0ID0gJCgnLmV4aXQnKTtcblx0XHR0aGlzLnR1dG9yaWFsID0gJCgnLnR1dG9yaWFsJyk7XG5cblx0XHR0aGlzLl9iaW5kRXZlbnRzKCk7XG5cdFx0dGhpcy5fY3JlYXRlV2luZG93cygpO1xuXHR9XG5cdF9iaW5kRXZlbnRzKCkge1xuXHRcdHRoaXMuc3RhcnQub24oJ2NsaWNrJywgKCkgPT4gdGhpcy5nYW1lLm5hdmlnYXRpb24udG9QbGF5KCkpO1xuXHRcdHRoaXMuc2V0dXAub24oJ2NsaWNrJywgKCkgPT4gdGhpcy5nYW1lLm5hdmlnYXRpb24udG9TZXR0aW5ncygpKTtcblx0XHR0aGlzLmV4aXQub24oJ2NsaWNrJywgKCkgPT4gdGhpcy5nYW1lLm5hdmlnYXRpb24udG9NZW51KCkpO1xuXHRcdHRoaXMudHV0b3JpYWwub24oJ2NsaWNrJywgKCkgPT4gdGhpcy5zaG93VHV0b3JpYWwoKSk7XG5cdH1cblx0X2NyZWF0ZVdpbmRvd3MoKSB7XG5cdFx0aWYoIWxvY2FsU3RvcmFnZS5nZXRJdGVtKCdpc1Nob3dJbmZvJykpIHtcblx0XHRcdHRoaXMuZ2FtZS53aW5kb3dNYW5hZ2VyLmFkZFdpbmRvdyh7XG5cdFx0XHRcdFwibGFiZWxcIjogXCJJTkZPXCIsXG5cdFx0XHRcdFwidGV4dFwiOiBgXG5cdFx0XHRcdFx0VG8gU2V0dGluZ3MsIHByZXNzIFMgPGJyPlxuXHRcdFx0XHRcdFNob3cgVHV0b3JpYWwsIHByZXNzIFRcblx0XHRcdFx0YFxuXHRcdFx0fSwgKCkgPT4ge1xuXHRcdFx0XHR0aGlzLnNob3dUdXRvcmlhbCgpO1xuXHRcdFx0fSk7XG5cdFx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnaXNTaG93SW5mbycsIDEpO1xuXHRcdH1cblx0fVxuXHRzaG93VHV0b3JpYWwoKSB7XG5cdFx0aWYodGhpcy5nYW1lLnNldHRpbmdzLmxhbmcgPT0gJ3J1Jykge1xuXHRcdFx0dGhpcy5nYW1lLndpbmRvd01hbmFnZXIuYWRkV2luZG93KHtcblx0XHRcdFx0bGFiZWw6IFwiVFVUT1JJQUwgSVwiLFxuXHRcdFx0XHR0ZXh0OiBcItCU0LvRjyDQv9GA0L7RhdC+0LbQtNC10L3QuNGPINCz0L7Qu9C+0LLQvtC70L7QvNC60Lgg0L3QtdC+0LHRhdC+0LTQuNC80L4g0L/QtdGA0LXRgdC10LrQsNGC0Ywg0LjQs9GA0L7QstGL0LUg0YLQvtGH0LrQuCDQu9C40L3QuNGP0LzQuCwg0LrQvtGC0L7RgNGL0LUg0LLRiyDRgNCw0YHRgdGC0LDQstC70Y/QtdGC0LUg0L3QsNC20LDRgtC40Y/QvNC4INC/0L4g0Y3QutGA0LDQvdGDLCDQvtC00L3QsNC60L4g0LfQsNC/0L7QvNC90LjRgtC1LCDRh9GC0L4g0LvQuNC90LjQuCDRj9Cy0LvRj9GO0YLRgdGPINCx0LXRgdC60L7QvdC10YfQvdGL0LzQuCwg0L3QviDQktGLINCy0LjQtNC40YLQtSDRgtC+0LvRjNC60L4g0L7RgtGA0LXQt9C60Lgg0Y3RgtC40YUg0LvQuNC90LjQuSFcIlxuXHRcdFx0fSwgKCkgPT4ge1xuXHRcdFx0XHR0aGlzLmdhbWUud2luZG93TWFuYWdlci5hZGRXaW5kb3coe1xuXHRcdFx0XHRcdGxhYmVsOiBcIlRVVE9SSUFMIElJXCIsXG5cdFx0XHRcdFx0dGV4dDogXCLQkiDQuNCz0YDQtSDRgtCw0Log0LbQtSDQv9GA0LjRgdGD0YLRgdGC0LLRg9GO0YIg0YDQsNC30LvQuNGH0L3Ri9C5INC60L7QvNCx0LjQvdCw0YbQuNC4INC+0LHRitC10LrRgtC+0LIuINCd0LDQv9GA0LjQvNC10YAg0LXRgdGC0Ywg0YLQvtGH0LrQuCwg0LrQvtGC0L7RgNGL0LUg0L3QtdC70YzQt9GPINC/0LXRgNC10YHQtdC60LDRgtGMINC4INGC0LDQuiDQtNCw0LvQtdC1LCDRgSDRjdGC0LjQvCDQktCw0Lwg0L3QtdC+0LHRhdC+0LTQuNC80L4g0YDQsNC30L7QsdGA0LDRgtGM0YHRjyDQuCDRgNC10YjQsNGC0Ywg0LPQvtC70L7QstC+0LvQvtC80LrQuCDRgdCw0LzQuNC8IVwiXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuZ2FtZS53aW5kb3dNYW5hZ2VyLmFkZFdpbmRvdyh7XG5cdFx0XHRcdGxhYmVsOiBcIlRVVE9SSUFMIElcIixcblx0XHRcdFx0dGV4dDogXCJUbyBjb21wbGV0ZSB0aGUgcHV6emxlLCB5b3UgbmVlZCB0byBjcm9zcyB0aGUgZ2FtZSBwb2ludHMgd2l0aCBsaW5lcyB0aGF0IHlvdSBwbGFjZSB3aXRoIHRoZSBwcmVzc2VzIG9uIHRoZSBzY3JlZW4sIGJ1dCByZW1lbWJlciB0aGF0IHRoZSBsaW5lcyBhcmUgZW5kbGVzcywgYnV0IHlvdSBzZWUgb25seSB0aGUgc2VnbWVudHMgb2YgdGhlc2UgbGluZXMhXCJcblx0XHRcdH0sICgpID0+IHtcblx0XHRcdFx0dGhpcy5nYW1lLndpbmRvd01hbmFnZXIuYWRkV2luZG93KHtcblx0XHRcdFx0XHRsYWJlbDogXCJUVVRPUklBTCBJSVwiLFxuXHRcdFx0XHRcdHRleHQ6IFwiSW4gdGhlIGdhbWUgdGhlcmUgYXJlIGFsc28gZGlmZmVyZW50IGNvbWJpbmF0aW9ucyBvZiBvYmplY3RzLiBGb3IgZXhhbXBsZSwgdGhlcmUgYXJlIHBvaW50cyB0aGF0IGNhbiBub3QgYmUgY3Jvc3NlZCwgYW5kIHNvIG9uLCB3aXRoIHRoaXMgeW91IG5lZWQgdG8gdW5kZXJzdGFuZCBhbmQgc29sdmUgdGhlIHB1enpsZXMgdGhlbXNlbHZlcyFcIlxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE1lbnU7XG4iLCJjb25zdCBMZXZlbCA9IHJlcXVpcmUoJy4uL2xldmVsL0xldmVsJyk7XG5cbmNsYXNzIFBsYXkge1xuXHRjb25zdHJ1Y3RvcihnYW1lKSB7XG5cdFx0dGhpcy5nYW1lID0gZ2FtZTtcblxuXHRcdHRoaXMuc2NlbmUgPSAkKCcjZ2FtZScpO1xuXHRcdHRoaXMucGFwZXIgPSBTbmFwKCdzdmcnKTtcblx0XHR0aGlzLnBhcGVyLmF0dHIoe1xuXHRcdFx0d2lkdGg6IHRoaXMuZ2FtZS53LFxuXHRcdFx0aGVpZ2h0OiB0aGlzLmdhbWUuaFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5jdXJyZW50TGV2ZWwgPSArbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2N1cnJlbnRMZXZlbCcpIHx8IDA7XG5cdFx0dGhpcy5sZXZlbHMgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnbGV2ZWxzJykgPyBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdsZXZlbHMnKSkgOiByZXF1aXJlKCcuLi9sZXZlbHMnKTtcblx0XHR0aGlzLmlzTGV2ZWxPdmVyID0gZmFsc2U7XG5cblx0XHR0aGlzLl9iaW5kRXZlbnRzKCk7XG5cdH1cblx0X2JpbmRFdmVudHMoKSB7XG5cdFx0JCgnI2dhbWUnKS5vbignY2xpY2snLCAoZSkgPT4gdGhpcy51c2VyQWN0aW9uKGUpKTtcblx0XHQkKCcjaW50ZXJmYWNlJykub24oJ2NsaWNrJywgKGUpID0+IHRoaXMudXNlckFjdGlvbihlKSk7XG5cdH1cblxuXHRyZXNpemUoKSB7XG5cdFx0dGhpcy5wYXBlci5hdHRyKHtcblx0XHRcdHdpZHRoOiB0aGlzLmdhbWUudyxcblx0XHRcdGhlaWdodDogdGhpcy5nYW1lLmhcblx0XHR9KTtcblxuXHRcdHRoaXMucmVzdGFydExldmVsKCk7XG5cdH1cblxuXHR1c2VyQWN0aW9uKGUpIHtcblx0XHRpZihlLnRhcmdldC50YWdOYW1lID09PSAnQlVUVE9OJykgcmV0dXJuO1xuXG5cdFx0dmFyIHggPSBNYXRoLnJvdW5kKGUuY2xpZW50WC90aGlzLmdhbWUuem9vbSk7XG5cdFx0dmFyIHkgPSBNYXRoLnJvdW5kKGUuY2xpZW50WS90aGlzLmdhbWUuem9vbSk7XG5cblx0XHRpZih0aGlzLmxldmVsLmFyZWFzLmFjdGl2YXRlQXJlYSh4LCB5KSAmJiB0aGlzLmxldmVsLnN0ZXBzTGVmdCAmJiAhdGhpcy5pc0xldmVsT3Zlcikge1xuXHRcdFx0dGhpcy5sZXZlbC5zdGVwc0xlZnQtLTtcblx0XHRcdHRoaXMubGV2ZWwuY2xpY2tzKys7XG5cdFx0XHR0aGlzLmxldmVsLnVwZGF0ZSgpO1xuXHRcdFx0dGhpcy5sZXZlbC51c2VyUGF0aC5hZGRQb2ludCh4LCB5KTtcblx0XHRcdHRoaXMubGV2ZWwudXNlci5hZGRDaXJjbGUoeCwgeSwgJ3VzZXInKTtcblx0XHRcdHRoaXMubGV2ZWwuY2hlY2tMZXZlbE92ZXIoKTtcblx0XHRcdHRoaXMuZ2FtZS5pbnRlcmZhY2UudXBkYXRlR2FtZUluZm8oKTtcblx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjbGlja3MnLCB0aGlzLmxldmVsLmNsaWNrcyk7XG5cdFx0fVxuXHR9XG5cblx0bG9hZExldmVsKGx2bCA9IHRoaXMuY3VycmVudExldmVsLCBpc05ldyA9IHRydWUpIHtcblx0XHRpZih0aGlzLmxldmVsc1tsdmxdKSB7XG5cdFx0XHR0aGlzLmN1cnJlbnRMZXZlbCA9IGx2bDtcblxuXHRcdFx0dGhpcy5kZWxldGVMZXZlbCgpO1xuXHRcdFx0dGhpcy5sZXZlbCA9IG5ldyBMZXZlbCh0aGlzLCBpc05ldywgdGhpcy5sZXZlbHNbbHZsXSk7XG5cdFx0XHR0aGlzLmdhbWUuaW50ZXJmYWNlLnVwZGF0ZUdhbWVJbmZvKCk7XG5cblx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjdXJyZW50TGV2ZWwnLCB0aGlzLmN1cnJlbnRMZXZlbCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuZ2FtZS5hamF4UmVxdWVzdHMucmVxdWVzdE5ld0xldmVscygpO1xuXHRcdH1cblx0fVxuXHRkZWxldGVMZXZlbCgpIHtcblx0XHRpZih0aGlzLmxldmVsKSB7XG5cdFx0XHR0aGlzLmxldmVsLnN2Zy5yZW1vdmUoKTtcblx0XHRcdHRoaXMubGV2ZWwgPSBudWxsO1xuXHRcdH1cblx0fVxuXG5cdG5leHRMZXZlbCgpIHtcblx0XHRpZighdGhpcy5pc0xldmVsT3Zlcikge1xuXHRcdFx0dGhpcy5sb2FkTGV2ZWwodGhpcy5jdXJyZW50TGV2ZWwrMSwgdHJ1ZSk7XG5cdFx0fVxuXHR9XG5cdGJhY2tMZXZlbCgpIHtcblx0XHRpZighdGhpcy5pc0xldmVsT3Zlcikge1xuXHRcdFx0dGhpcy5sb2FkTGV2ZWwodGhpcy5jdXJyZW50TGV2ZWwtMSwgdHJ1ZSk7XG5cdFx0fVxuXHR9XG5cdHJlc3RhcnRMZXZlbCgpIHtcblx0XHRpZighdGhpcy5pc0xldmVsT3Zlcikge1xuXHRcdFx0dGhpcy5sb2FkTGV2ZWwodGhpcy5jdXJyZW50TGV2ZWwsIGZhbHNlKTtcblx0XHR9XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQbGF5O1xuIiwiY29uc3QgaGVscGVyID0gcmVxdWlyZSgnLi4vbWl4aW5zL2hlbHBlcicpO1xuXG5jbGFzcyBTZXR0aW5ncyB7XG5cdGNvbnN0cnVjdG9yKGdhbWUpIHtcblx0XHR0aGlzLmdhbWUgPSBnYW1lO1xuXG5cdFx0dGhpcy5zY2VuZSA9ICQoJyNzZXR0aW5ncycpO1xuXG5cdFx0dGhpcy5wcm9wTXVzaWMgPSAkKCcjcHJvcE11c2ljJyk7XG5cdFx0dGhpcy5wcm9wRWZmZWN0ID0gJCgnI3Byb3BFZmZlY3QnKTtcblx0XHR0aGlzLnByb3BMYW5nID0gJCgnI3Byb3BMYW5nJyk7XG5cdFx0dGhpcy5wcm9wUmVzZXQgPSAkKCcjcHJvcFJlc2V0Jyk7XG5cblx0XHR0aGlzLmN1ckxhbmcgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnbGFuZycpLTAgfHwgMDtcblx0XHR0aGlzLmxhbmdzID0gWydlbicsICdydSddO1xuXHRcdHRoaXMubGFuZyA9IHRoaXMubGFuZ3NbdGhpcy5jdXJMYW5nXTtcblxuXHRcdHRoaXMuaXNNdXNpYyA9IHRydWU7XG5cdFx0dGhpcy5pc0dyYXBoaWNzID0gdHJ1ZTtcblxuXHRcdHRoaXMuX2JpbmRFdmVudHMoKTtcblx0fVxuXHRfYmluZEV2ZW50cygpIHtcblx0XHR0aGlzLnByb3BNdXNpYy5jaGlsZHJlbigpLm9uKCdjbGljaycsICgpID0+IHRoaXMudG9nZ2xlTXVzaWMoKSk7XG5cdFx0dGhpcy5wcm9wRWZmZWN0LmNoaWxkcmVuKCkub24oJ2NsaWNrJywgKCkgPT4gdGhpcy50b2dnbGVFZmZlY3QoKSk7XG5cdFx0dGhpcy5wcm9wTGFuZy5jaGlsZHJlbigpLm9uKCdjbGljaycsICgpID0+IHRoaXMuc2VsZWN0TGFuZygpKTtcblx0XHR0aGlzLnByb3BSZXNldC5jaGlsZHJlbigpLm9uKCdjbGljaycsICgpID0+IHRoaXMucmVzZXRHYW1lKCkpO1xuXHR9XG5cblx0dG9nZ2xlTXVzaWMoKSB7XG5cdFx0dGhpcy5pc011c2ljID0gIXRoaXMuaXNNdXNpYztcblxuXHRcdHRoaXMucHJvcE11c2ljLmNoaWxkcmVuKCkuaHRtbCh0aGlzLmlzTXVzaWMgPyAnT04nIDogJ09GRicpO1xuXHRcdHRoaXMuaXNNdXNpYyA/IHRoaXMuZ2FtZS5tdXNpYy5wbGF5KCkgOiB0aGlzLmdhbWUubXVzaWMuc3RvcCgpO1xuXHR9XG5cdHJlc2V0R2FtZSgpIHtcblx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnY3VycmVudExldmVsJywgMCk7XG5cdH1cblx0dG9nZ2xlRWZmZWN0KCkge1xuXHRcdHRoaXMuaXNHcmFwaGljcyA9ICF0aGlzLmlzR3JhcGhpY3M7XG5cblx0XHR0aGlzLnByb3BFZmZlY3QuY2hpbGRyZW4oKS5odG1sKHRoaXMuaXNHcmFwaGljcyA/ICdPTicgOiAnT0ZGJyk7XG5cdFx0dGhpcy5nYW1lLmVmZmVjdC50b2dnbGUodGhpcy5pc0dyYXBoaWNzKTtcblx0fVxuXHRzZWxlY3RMYW5nKCkge1xuXHRcdHRoaXMuY3VyTGFuZyA9IGhlbHBlci5pblJhbmdlQXJyYXkodGhpcy5jdXJMYW5nICsgMSwgdGhpcy5sYW5ncyk7XG5cdFx0dGhpcy5sYW5nID0gdGhpcy5sYW5nc1t0aGlzLmN1ckxhbmddO1xuXG5cdFx0dGhpcy5wcm9wTGFuZy5jaGlsZHJlbigpLmh0bWwodGhpcy5sYW5nLnRvVXBwZXJDYXNlKCkpO1xuXHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdsYW5nJywgdGhpcy5jdXJMYW5nKTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNldHRpbmdzO1xuIiwiY2xhc3MgU3BsYXNoIHtcblx0Y29uc3RydWN0b3IoZ2FtZSkge1xuXHRcdHRoaXMuZ2FtZSA9IGdhbWU7XG5cdFx0XG5cdFx0dGhpcy5zcGxhc2ggPSAkKCcjc3BsYXNoJyk7XG5cdH1cblxuXHRzaG93KGNiKSB7XG5cdFx0dGhpcy5zcGxhc2hcblx0XHRcdC5jc3Moe1xuXHRcdFx0XHRvcGFjaXR5OiAxLFxuXHRcdFx0XHRkaXNwbGF5OiAnYmxvY2snXG5cdFx0XHR9KVxuXHRcdFx0LmZhZGVPdXQoNDAwLCBjYik7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTcGxhc2g7Il19
