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
	},
	mobileAndTabletcheck() {
	  var check = false;
	  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
	  return check;
	}
};



module.exports = helper;

},{}],19:[function(require,module,exports){
const services = require('../services.json');

var notifications = (game) => {
	if(!window.plugins || !window.plugins.OneSignal) return;

	window.plugins.OneSignal
		.startInit(services.OneSignalId, services.GooglePlayId)
		.sendTag('edition', game.edition)
		.sendTag('version', 'v2.2')
		.endInit();
}

module.exports = notifications;

},{"../services.json":26}],20:[function(require,module,exports){
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
const helper = require('../mixins/helper');

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

		var g = this.paper.gradient("r(0.5, 0.5, 0.5)#fff-rgba(255, 255, 255, 0)");
		this.trajectoryLine =
			this.paper
				.path('')
				.attr({
					fill: 'transparent',
					stroke: g,
					strokeWidth: 3,
					strokeDasharray: '3px'
				});


		this._bindEvents();
	}
	_bindEvents() {
		$('#interface').on('click', (e) => this.userAction(e));

		if(helper.mobileAndTabletcheck()) {
			$('#game').on('touchstart', (e) => {
				this.trajectoryLineShow(e.touches[0]);
				$('#game').on('touchmove', (e) => {
					this.trajectoryLineShow(e.touches[0]);
				});
			});

			$('#game').on('touchend', (e) => {
				$('#game').off('touchmove');
				this.userAction(e);
				this.trajectoryLine.attr({d: ''});
			});
		} else {
			$('#game').on('mousedown', (e) => {
				this.trajectoryLineShow(e);
				$('#game').on('mousemove', (e) => {
					this.trajectoryLineShow(e);
				});
			});
			$('#game').on('mouseup', (e) => {
				$('#game').off('mousemove');
				this.userAction(e);
				this.trajectoryLine.attr({d: ''});
			})
		}
	}
	trajectoryLineShow(e) {
		if(!this.level.userPath.points.length || !this.level.stepsLeft) return;

		let p = this.level.userPath.points[this.level.userPath.points.length-1];
		var lower = helper.getlongСoordsLine(p.x, p.y, e.clientX/this.game.zoom, e.clientY/this.game.zoom, 1.5);
		var upper = helper.getlongСoordsLine(e.clientX/this.game.zoom, e.clientY/this.game.zoom, p.x, p.y, 2);

		this.trajectoryLine.attr({
			d: 'M' +  lower.x + ',' + lower.y + 'L' + upper.x + ',' + upper.y
		});
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

		var x = Math.round((e.clientX || e.changedTouches[0].clientX)/this.game.zoom);
		var y = Math.round((e.clientY || e.changedTouches[0].clientY)/this.game.zoom);

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

},{"../level/Level":7,"../levels":13,"../mixins/helper":18}],24:[function(require,module,exports){
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
},{}],26:[function(require,module,exports){
module.exports={
  "OneSignalId": "d456f2c5-0c1b-4b1e-b1b1-b49cd91acda8",
  "GooglePlayId": "81692506806"
}

},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcYXpiYW5nXFxEZXNrdG9wXFxsaW5lc1xcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiQzovVXNlcnMvYXpiYW5nL0Rlc2t0b3AvbGluZXMvc3JjL2pzL0dhbWUuanMiLCJDOi9Vc2Vycy9hemJhbmcvRGVza3RvcC9saW5lcy9zcmMvanMvZmFrZV82OWFhNmMwNy5qcyIsIkM6L1VzZXJzL2F6YmFuZy9EZXNrdG9wL2xpbmVzL3NyYy9qcy9sZXZlbC9BcmVhc01hbmFnZXIuanMiLCJDOi9Vc2Vycy9hemJhbmcvRGVza3RvcC9saW5lcy9zcmMvanMvbGV2ZWwvQ2lyY2xlc01hbmFnZXIuanMiLCJDOi9Vc2Vycy9hemJhbmcvRGVza3RvcC9saW5lcy9zcmMvanMvbGV2ZWwvQ3Jvc3NDaXJjbGUuanMiLCJDOi9Vc2Vycy9hemJhbmcvRGVza3RvcC9saW5lcy9zcmMvanMvbGV2ZWwvSGludENpcmNsZS5qcyIsIkM6L1VzZXJzL2F6YmFuZy9EZXNrdG9wL2xpbmVzL3NyYy9qcy9sZXZlbC9MZXZlbC5qcyIsIkM6L1VzZXJzL2F6YmFuZy9EZXNrdG9wL2xpbmVzL3NyYy9qcy9sZXZlbC9QYXRoTWFuYWdlci5qcyIsIkM6L1VzZXJzL2F6YmFuZy9EZXNrdG9wL2xpbmVzL3NyYy9qcy9sZXZlbC9Ub3VjaEFyZWEuanMiLCJDOi9Vc2Vycy9hemJhbmcvRGVza3RvcC9saW5lcy9zcmMvanMvbGV2ZWwvVW5jcm9zc0NpcmNsZS5qcyIsIkM6L1VzZXJzL2F6YmFuZy9EZXNrdG9wL2xpbmVzL3NyYy9qcy9sZXZlbC9VbnRvdWNoQXJlYS5qcyIsIkM6L1VzZXJzL2F6YmFuZy9EZXNrdG9wL2xpbmVzL3NyYy9qcy9sZXZlbC9Vc2VyQ2lyY2xlLmpzIiwiQzovVXNlcnMvYXpiYW5nL0Rlc2t0b3AvbGluZXMvc3JjL2pzL2xldmVscy5qc29uIiwiQzovVXNlcnMvYXpiYW5nL0Rlc2t0b3AvbGluZXMvc3JjL2pzL21peGlucy9BamF4UmVxdWVzdHMuanMiLCJDOi9Vc2Vycy9hemJhbmcvRGVza3RvcC9saW5lcy9zcmMvanMvbWl4aW5zL05hdmlnYXRpb24uanMiLCJDOi9Vc2Vycy9hemJhbmcvRGVza3RvcC9saW5lcy9zcmMvanMvbWl4aW5zL1dpbmRvd01hbmFnZXIuanMiLCJDOi9Vc2Vycy9hemJhbmcvRGVza3RvcC9saW5lcy9zcmMvanMvbWl4aW5zL2Fkcy5qcyIsIkM6L1VzZXJzL2F6YmFuZy9EZXNrdG9wL2xpbmVzL3NyYy9qcy9taXhpbnMvaGVscGVyLmpzIiwiQzovVXNlcnMvYXpiYW5nL0Rlc2t0b3AvbGluZXMvc3JjL2pzL21peGlucy9ub3RpZmljYXRpb25zLmpzIiwiQzovVXNlcnMvYXpiYW5nL0Rlc2t0b3AvbGluZXMvc3JjL2pzL3NjZW5lcy9DYW52YXNFZmZlY3QuanMiLCJDOi9Vc2Vycy9hemJhbmcvRGVza3RvcC9saW5lcy9zcmMvanMvc2NlbmVzL0ludGVyZmFjZS5qcyIsIkM6L1VzZXJzL2F6YmFuZy9EZXNrdG9wL2xpbmVzL3NyYy9qcy9zY2VuZXMvTWVudS5qcyIsIkM6L1VzZXJzL2F6YmFuZy9EZXNrdG9wL2xpbmVzL3NyYy9qcy9zY2VuZXMvUGxheS5qcyIsIkM6L1VzZXJzL2F6YmFuZy9EZXNrdG9wL2xpbmVzL3NyYy9qcy9zY2VuZXMvU2V0dGluZ3MuanMiLCJDOi9Vc2Vycy9hemJhbmcvRGVza3RvcC9saW5lcy9zcmMvanMvc2NlbmVzL1NwbGFzaC5qcyIsIkM6L1VzZXJzL2F6YmFuZy9EZXNrdG9wL2xpbmVzL3NyYy9qcy9zZXJ2aWNlcy5qc29uIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeDBDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBzY2VuZXNcclxudmFyIENhbnZhc0VmZmVjdCA9IHJlcXVpcmUoJy4vc2NlbmVzL0NhbnZhc0VmZmVjdCcpO1xyXG52YXIgU2V0dGluZ3MgPSByZXF1aXJlKCcuL3NjZW5lcy9TZXR0aW5ncycpO1xyXG52YXIgSW50ZXJmYWNlID0gcmVxdWlyZSgnLi9zY2VuZXMvSW50ZXJmYWNlJyk7XHJcbnZhciBNZW51ID0gcmVxdWlyZSgnLi9zY2VuZXMvTWVudScpO1xyXG52YXIgUGxheSA9IHJlcXVpcmUoJy4vc2NlbmVzL1BsYXknKTtcclxudmFyIFNwbGFzaCA9IHJlcXVpcmUoJy4vc2NlbmVzL1NwbGFzaCcpO1xyXG5cclxuLy8gbWl4aW5zXHJcbnZhciBOYXZpZ2F0aW9uID0gcmVxdWlyZSgnLi9taXhpbnMvTmF2aWdhdGlvbicpO1xyXG52YXIgV2luZG93TWFuYWdlciA9IHJlcXVpcmUoJy4vbWl4aW5zL1dpbmRvd01hbmFnZXInKTtcclxudmFyIEFqYXhSZXF1ZXN0cyA9IHJlcXVpcmUoJy4vbWl4aW5zL0FqYXhSZXF1ZXN0cycpO1xyXG52YXIgaGVscGVyID0gcmVxdWlyZSgnLi9taXhpbnMvaGVscGVyJyk7XHJcblxyXG5jbGFzcyBHYW1lIHtcclxuXHRjb25zdHJ1Y3Rvcihjb25maWcpIHtcclxuXHRcdCQoJyNzcGxhc2gnKS5mYWRlT3V0KCk7XHJcblxyXG5cdFx0dGhpcy5lZGl0aW9uID0gY29uZmlnLmVkaXRpb24gfHwgJ0ZSRUUnO1xyXG5cdFx0dGhpcy5ub3RpZmljYXRpb25zID0gcmVxdWlyZSgnLi9taXhpbnMvbm90aWZpY2F0aW9ucycpO1xyXG5cdFx0dGhpcy5hZHMgPSByZXF1aXJlKCcuL21peGlucy9hZHMnKTtcclxuXHRcdHRoaXMubm90aWZpY2F0aW9ucyh0aGlzKTtcclxuXHRcdHRoaXMuYWRzLmluaXQodGhpcyk7XHJcblxyXG5cdFx0dGhpcy56b29tID0gJCh3aW5kb3cpLndpZHRoKCkvMTAwMCA+IDEgPyAxIDogJCh3aW5kb3cpLndpZHRoKCkvMTAwMDtcclxuXHRcdCQoJ2JvZHknKS5jc3MoJ3pvb20nLCB0aGlzLnpvb20pO1xyXG5cclxuXHRcdHRoaXMudyA9IE1hdGgucm91bmQoJCh3aW5kb3cpLndpZHRoKCkvdGhpcy56b29tKTtcclxuXHRcdHRoaXMuaCA9IE1hdGgucm91bmQoJCh3aW5kb3cpLmhlaWdodCgpL3RoaXMuem9vbSk7XHJcblx0XHR0aGlzLmNlbnRlclggPSB0aGlzLncvMjtcclxuXHRcdHRoaXMuY2VudGVyWSA9IHRoaXMuaC8yO1xyXG5cclxuXHRcdHRoaXMubGV2ZWxPdmVyQ2xpY2tzID0gMDtcclxuXHRcdHRoaXMucmVzdGFydENsaWNrcyA9IDA7XHJcblxyXG5cdFx0dGhpcy5uYXZpZ2F0aW9uID0gbmV3IE5hdmlnYXRpb24odGhpcyk7XHJcblx0XHR0aGlzLndpbmRvd01hbmFnZXIgPSBuZXcgV2luZG93TWFuYWdlcih0aGlzKTtcclxuXHRcdHRoaXMuYWpheFJlcXVlc3RzID0gbmV3IEFqYXhSZXF1ZXN0cyh0aGlzLCBjb25maWcucmVwb3NpdG9yeSk7XHJcblxyXG5cdFx0dGhpcy5lZmZlY3QgPSBuZXcgQ2FudmFzRWZmZWN0KHRoaXMsIGNvbmZpZy5lZmZlY3QpO1xyXG5cdFx0dGhpcy5wbGF5ID0gbmV3IFBsYXkodGhpcywgY29uZmlnLnBsYXkpO1xyXG5cdFx0dGhpcy5zZXR0aW5ncyA9IG5ldyBTZXR0aW5ncyh0aGlzKTtcclxuXHRcdHRoaXMuaW50ZXJmYWNlID0gbmV3IEludGVyZmFjZSh0aGlzKTtcclxuXHRcdHRoaXMubWVudSA9IG5ldyBNZW51KHRoaXMpO1xyXG5cdFx0dGhpcy5zcGxhc2ggPSBuZXcgU3BsYXNoKHRoaXMpO1xyXG5cclxuXHRcdHRoaXMubmF2aWdhdGlvbi50b01lbnUoKTtcclxuXHJcblx0XHR0aGlzLm11c2ljID0gQXVkaW9GWChjb25maWcubXVzaWMuZmlsZSwge1xyXG5cdFx0XHR2b2x1bWU6IDAuNSxcclxuXHRcdFx0bG9vcDogdHJ1ZSxcclxuXHRcdFx0YXV0b3BsYXk6IHRydWUgXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBoZWxwZXIgbWV0aG9kIFwicmVzaXplRW5kXCJcclxuXHRcdCQod2luZG93KS5yZXNpemUoZnVuY3Rpb24oKSB7XHJcblx0XHRcdGlmKHRoaXMucmVzaXplVE8pIGNsZWFyVGltZW91dCh0aGlzLnJlc2l6ZVRPKTtcclxuXHJcblx0XHRcdHRoaXMucmVzaXplVE8gPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdCQodGhpcykudHJpZ2dlcigncmVzaXplRW5kJyk7XHJcblx0XHRcdH0sIDUwMCk7XHJcblx0XHR9KTtcclxuXHRcdCQod2luZG93KS5iaW5kKCdyZXNpemVFbmQnLCAoKSA9PiB0aGlzLnJlc2l6ZSgpKTtcclxuXHR9XHJcblx0cmVzaXplKCkge1xyXG5cdFx0dGhpcy56b29tID0gJCh3aW5kb3cpLndpZHRoKCkvMTAwMCA+IDEgPyAxIDogJCh3aW5kb3cpLndpZHRoKCkvMTAwMDtcclxuXHRcdCQoJ2JvZHknKS5jc3MoJ3pvb20nLCB0aGlzLnpvb20pO1xyXG5cclxuXHRcdHRoaXMudyA9IE1hdGgucm91bmQoJCh3aW5kb3cpLndpZHRoKCkvdGhpcy56b29tKTtcclxuXHRcdHRoaXMuaCA9IE1hdGgucm91bmQoJCh3aW5kb3cpLmhlaWdodCgpL3RoaXMuem9vbSk7XHJcblx0XHR0aGlzLmNlbnRlclggPSB0aGlzLncvMjtcclxuXHRcdHRoaXMuY2VudGVyWSA9IHRoaXMuaC8yO1xyXG5cclxuXHRcdHRoaXMuZWZmZWN0LnJlc2l6ZSgpO1xyXG5cdFx0dGhpcy5wbGF5LnJlc2l6ZSgpO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHYW1lOyIsImNvbnN0IEdhbWUgPSByZXF1aXJlKCcuL0dhbWUnKTtcclxuXHJcbnZhciByZWFkeSA9IGZ1bmN0aW9uKCkge1xyXG5cdHZhciBnYW1lID0gbmV3IEdhbWUoe1xyXG5cdFx0cGxheToge1xyXG5cdFx0XHRjdXJyZW50TGV2ZWw6IDBcclxuXHRcdH0sXHJcblx0XHRlZmZlY3Q6IHtcclxuXHRcdFx0cGFydGljbGVzOiBNYXRoLnJvdW5kKHdpbmRvdy5pbm5lcldpZHRoLzUwKSxcclxuXHRcdFx0aW1hZ2U6ICcuL2Fzc2V0cy9pbWcvcGFydGljbGUucG5nJyxcclxuXHRcdFx0Y29uZmlnOiB7XHJcblx0XHRcdFx0cjogWzIwLCAxMDBdLFxyXG5cdFx0XHRcdHg6IFswLCB3aW5kb3cuaW5uZXJXaWR0aF0sXHJcblx0XHRcdFx0eTogWzAsIHdpbmRvdy5pbm5lckhlaWdodF0sXHJcblx0XHRcdFx0dmVjWDogWy0uNSwgLjVdLFxyXG5cdFx0XHRcdHZlY1k6IFstLjUsIC41XSxcclxuXHRcdFx0XHRhbHBoYTogWy4xLCAuMl0sXHJcblx0XHRcdFx0Ymx1cjogWy43LCAuOF1cclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdG11c2ljOiB7XHJcblx0XHRcdGZpbGU6ICdhc3NldHMvbXVzaWMvbG9uZWxpbmVzcy5vZ2cnLFxyXG5cdFx0XHR2b2x1bWU6IDAuNSxcclxuXHRcdFx0bG9vcDogdHJ1ZVxyXG5cdFx0fSxcclxuXHRcdHJlcG9zaXRvcnk6ICdodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vQVpiYW5nL0xJTkVTX0NPTlNUUlVDVE9SL21hc3Rlci9sZXZlbHMnLFxyXG5cdFx0ZWRpdGlvbjogJ1BBSUQnXHJcblx0fSk7XHJcbn1cclxuXHJcbmlmKHdpbmRvdy5jb3Jkb3ZhKSBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2VyZWFkeScsIHJlYWR5LCBmYWxzZSlcclxuZWxzZSB3aW5kb3cub25sb2FkID0gcmVhZHk7XHJcbiIsImNvbnN0IGhlbHBlciA9IHJlcXVpcmUoJy4uL21peGlucy9oZWxwZXInKTtcclxuY29uc3QgVG91Y2hBcmVhID0gcmVxdWlyZSgnLi9Ub3VjaEFyZWEnKTtcclxuY29uc3QgVW50b3VjaEFyZWEgPSByZXF1aXJlKCcuL1VudG91Y2hBcmVhJyk7XHJcblxyXG5jbGFzcyBBcmVhc01hbmFnZXIge1xyXG5cdGNvbnN0cnVjdG9yKGxldmVsLCBjb25maWcpIHtcclxuXHRcdHRoaXMubGV2ZWwgPSBsZXZlbDtcclxuXHRcdHRoaXMuZ2FtZSA9IHRoaXMubGV2ZWwuZ2FtZTtcclxuXHRcdHRoaXMuZ3JvdXAgPSB0aGlzLmxldmVsLnN2Zy5nKCk7XHJcblxyXG5cdFx0dGhpcy5hcmVhcyA9IFtdO1xyXG5cclxuXHRcdHRoaXMuX3BhcnNlQ29uZmlnKGNvbmZpZyB8fCBbXSk7XHJcblx0fVxyXG5cclxuXHRfcGFyc2VDb25maWcoY29uZmlnKSB7XHJcblx0XHRpZiAoY29uZmlnLmxlbmd0aCkge1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNvbmZpZy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHZhciBhcmVhID0gY29uZmlnW2ldO1xyXG5cdFx0XHRcdHRoaXMuYWRkQXJlYShcclxuXHRcdFx0XHRcdHRoaXMubGV2ZWwuZ2FtZS5jZW50ZXJYICsgYXJlYS54LCBcclxuXHRcdFx0XHRcdHRoaXMubGV2ZWwuZ2FtZS5jZW50ZXJZICsgYXJlYS55LCBcclxuXHRcdFx0XHRcdGFyZWEudywgXHJcblx0XHRcdFx0XHRhcmVhLmgsIFxyXG5cdFx0XHRcdFx0YXJlYS50eXBlXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5hZGRBcmVhKDAsIDAsIHRoaXMubGV2ZWwuZ2FtZS53LCB0aGlzLmxldmVsLmdhbWUuaCwgJ3RvdWNoJyk7XHJcblx0XHR9XHJcblx0fVxyXG5cdGRlbGV0ZUFyZWFzKCkge1xyXG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMuYXJlYXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dGhpcy5hcmVhcy5yZWN0LnJlbW92ZSgpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5hcmVhcyA9IFtdO1xyXG5cdH1cclxuXHRhY3RpdmF0ZUFyZWEoeCwgeSkge1xyXG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMuYXJlYXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dmFyIHIgPSB0aGlzLmFyZWFzW2ldO1xyXG5cdFx0XHRpZihoZWxwZXIuaXNDb250YWlucyhyLngsIHIueSwgci53LCByLmgsIHgsIHkpKSByZXR1cm4gdGhpcy5hcmVhc1tpXS50b3VjaEV2ZW50KCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRhZGRBcmVhKHgsIHksIHcsIGgsIHR5cGUpIHtcclxuXHRcdHZhciBhID0gbmV3IEFyZWFzTWFuYWdlci50eXBlc1t0eXBlXSh0aGlzLCB4LCB5LCB3LCBoKTtcclxuXHRcdHRoaXMuYXJlYXMucHVzaChhKTtcclxuXHR9XHJcbn1cclxuXHJcbkFyZWFzTWFuYWdlci50eXBlcyA9IHtcclxuXHR0b3VjaDogVG91Y2hBcmVhLFxyXG5cdHVudG91Y2g6IFVudG91Y2hBcmVhXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQXJlYXNNYW5hZ2VyOyIsImNvbnN0IFVzZXJDaXJjbGUgPSByZXF1aXJlKCcuL1VzZXJDaXJjbGUnKTtcclxuY29uc3QgQ3Jvc3NDaXJjbGUgPSByZXF1aXJlKCcuL0Nyb3NzQ2lyY2xlJyk7XHJcbmNvbnN0IFVuY3Jvc3NDaXJjbGUgPSByZXF1aXJlKCcuL1VuY3Jvc3NDaXJjbGUnKTtcclxuY29uc3QgSGludENpcmNsZSA9IHJlcXVpcmUoJy4vSGludENpcmNsZScpO1xyXG5cclxuY2xhc3MgQ2lyY2xlc01hbmFnZXIge1xyXG5cdGNvbnN0cnVjdG9yKGxldmVsLCBjb25maWcpIHtcclxuXHRcdHRoaXMubGV2ZWwgPSBsZXZlbDtcclxuXHRcdHRoaXMuZ2FtZSA9IHRoaXMubGV2ZWwuZ2FtZTtcclxuXHRcdHRoaXMuZ3JvdXAgPSB0aGlzLmxldmVsLnN2Zy5nKCk7XHJcblxyXG5cdFx0dGhpcy5jaXJjbGVzID0gW107XHJcblxyXG5cdFx0Y29uZmlnICYmIHRoaXMuX3BhcnNlQ29uZmlnKGNvbmZpZyk7XHJcblx0fVxyXG5cclxuXHRfcGFyc2VDb25maWcoY29uZmlnKSB7XHJcblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgY29uZmlnLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHZhciBjaXJjbGUgPSBjb25maWdbaV07XHJcblx0XHRcdHRoaXMuYWRkQ2lyY2xlKFxyXG5cdFx0XHRcdHRoaXMubGV2ZWwuZ2FtZS5jZW50ZXJYICsgY2lyY2xlLngsIFxyXG5cdFx0XHRcdHRoaXMubGV2ZWwuZ2FtZS5jZW50ZXJZICsgY2lyY2xlLnksIFxyXG5cdFx0XHRcdGNpcmNsZS50eXBlXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cdGRlbGV0ZUNpcmNsZXMoKSB7XHJcblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5jaXJjbGVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHRoaXMuY2lyY2xlc1tpXS5jaXJjbGUucmVtb3ZlKCk7XHJcblx0XHR9XHJcblx0XHR0aGlzLmNpcmNsZXMgPSBbXTtcclxuXHR9XHJcblxyXG5cdGFkZENpcmNsZSh4LCB5LCB0eXBlKSB7XHJcblx0XHR2YXIgYyA9IG5ldyBDaXJjbGVzTWFuYWdlci50eXBlc1t0eXBlXSh0aGlzLCB4LCB5KTtcclxuXHRcdHRoaXMuY2lyY2xlcy5wdXNoKGMpO1xyXG5cdH1cclxufVxyXG5DaXJjbGVzTWFuYWdlci50eXBlcyA9IHtcclxuXHR1c2VyOiBVc2VyQ2lyY2xlLFxyXG5cdHVuY3Jvc3M6IFVuY3Jvc3NDaXJjbGUsXHJcblx0Y3Jvc3M6IENyb3NzQ2lyY2xlLFxyXG5cdGhpbnQ6IEhpbnRDaXJjbGVcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2lyY2xlc01hbmFnZXI7IiwiY2xhc3MgQ3Jvc3NDaXJjbGUge1xyXG5cdGNvbnN0cnVjdG9yKG1hbmFnZXIsIHgsIHkpIHtcclxuXHRcdHRoaXMubWFuYWdlciA9IG1hbmFnZXI7XHJcblx0XHRcclxuXHRcdHRoaXMuY2lyY2xlID0gdGhpcy5tYW5hZ2VyLmdyb3VwLmNpcmNsZSh4LCB5LCAwKTtcclxuXHRcdHRoaXMuY2lyY2xlLmF0dHIoe1xyXG5cdFx0XHRcdGZpbGw6ICdyZ2IoMjI4LCA3OCwgNzgpJyxcclxuXHRcdFx0XHRzdHJva2VXaWR0aDogM1xyXG5cdFx0fSk7XHJcblx0XHR0aGlzLmNpcmNsZS5hbmltYXRlKHtcclxuXHRcdFx0cjogMjVcclxuXHRcdH0sIDEwMDAsIG1pbmEuZWxhc3RpYyk7XHJcblxyXG5cdFx0dGhpcy50eXBlID0gJ2Nyb3NzJztcclxuXHRcdHRoaXMueCA9IHg7XHJcblx0XHR0aGlzLnkgPSB5O1xyXG5cdFx0dGhpcy5yID0gMjU7XHJcblxyXG5cdH1cclxuXHRzdGFydENyb3NzQW5pbWF0aW9uKCkge1xyXG5cdFx0dGhpcy5jaXJjbGUuYW5pbWF0ZSh7XHJcblx0XHRcdGZpbGw6ICcjOEJDMzRBJ1xyXG5cdFx0fSwgMTAwMCk7XHJcblx0fVxyXG5cdGNyb3NzRXZlbnQoKSB7XHJcblx0XHR0aGlzLm1hbmFnZXIubGV2ZWwuaW50ZXJzZWN0aW9uc0xlZnQtLTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ3Jvc3NDaXJjbGU7IiwiY2xhc3MgQ3Jvc3NDaXJjbGUge1xyXG5cdGNvbnN0cnVjdG9yKG1hbmFnZXIsIHgsIHkpIHtcclxuXHRcdHRoaXMubWFuYWdlciA9IG1hbmFnZXI7XHJcblx0XHRcclxuXHRcdHRoaXMuY2lyY2xlID0gdGhpcy5tYW5hZ2VyLmdyb3VwLmNpcmNsZSh4LCB5LCAzNSk7XHJcblx0XHR0aGlzLmNpcmNsZS5hdHRyKHtcclxuXHRcdFx0ZmlsbDogJ3JnYmEoMjI1LCAyMjUsIDIyNSwgMC4zKScsXHJcblx0XHRcdHN0cm9rZTogJyNmZmYnLFxyXG5cdFx0XHRzdHJva2VXaWR0aDogMixcclxuXHRcdFx0cjogMFxyXG5cdFx0fSk7XHJcblx0XHR0aGlzLmNpcmNsZS5hbmltYXRlKHtcclxuXHRcdFx0cjogMzBcclxuXHRcdH0sIDUwMCwgbWluYS5lbGFzdGljKTtcclxuXHJcblx0XHR0aGlzLnR5cGUgPSAnaGludCc7XHJcblx0XHR0aGlzLnIgPSAzNTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ3Jvc3NDaXJjbGU7IiwidmFyIGhlbHBlciA9IHJlcXVpcmUoJy4uL21peGlucy9oZWxwZXInKTtcclxudmFyIENpcmNsZXNNYW5hZ2VyID0gcmVxdWlyZSgnLi9DaXJjbGVzTWFuYWdlcicpO1xyXG52YXIgQXJlYXNNYW5hZ2VyID0gcmVxdWlyZSgnLi9BcmVhc01hbmFnZXInKTtcclxudmFyIFBhdGhNYW5hZ2VyID0gcmVxdWlyZSgnLi9QYXRoTWFuYWdlcicpO1xyXG5cclxuY2xhc3MgTGV2ZWwge1xyXG5cdGNvbnN0cnVjdG9yKHBsYXksIGlzTmV3LCBjb25maWcpIHtcclxuXHRcdHRoaXMuZ2FtZSA9IHBsYXkuZ2FtZTtcclxuXHRcdHRoaXMucGxheSA9IHBsYXk7XHJcblx0XHR0aGlzLmNvbmZpZyA9IGNvbmZpZyB8fCB7fVxyXG5cdFx0dGhpcy5pc05ldyA9IGlzTmV3O1xyXG5cclxuXHRcdHRoaXMuc3ZnID0gdGhpcy5wbGF5LnBhcGVyLnN2ZygwLCAwLCB0aGlzLmdhbWUudywgdGhpcy5nYW1lLmgpO1xyXG5cclxuXHRcdHRoaXMuY3VycmVudFdpbmRvdyA9IDA7XHJcblxyXG5cdFx0dGhpcy5sYWJlbCA9IHRoaXMuY29uZmlnLmxhYmVsIHx8ICdMRVZFTCc7XHJcblx0XHR0aGlzLnN0ZXBzTGVmdCA9IHRoaXMuY29uZmlnLnN0ZXBzIHx8IDA7XHJcblx0XHR0aGlzLmludGVyc2VjdGlvbnNMZWZ0ID0gdGhpcy5jb25maWcuaW50ZXJzZWN0aW9ucyB8fCAwO1xyXG5cclxuXHRcdHRoaXMuY2xpY2tzID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2NsaWNrcycpLTAgfHwgMDtcclxuXHRcdHRoaXMuY3VycmVudEhpbnQgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY3VycmVudEhpbnQnKS0wIHx8IDA7XHJcblxyXG5cdFx0dGhpcy5nYW1lLmFkcy5sb2FkKCk7XHJcblx0XHR0aGlzLl9sb2FkTGV2ZWwoKTtcclxuXHRcdHRoaXMudXBkYXRlKCk7XHJcblx0fVxyXG5cclxuXHRfbG9hZExldmVsKCkge1xyXG5cdFx0dGhpcy5hcmVhcyA9IG5ldyBBcmVhc01hbmFnZXIodGhpcywgdGhpcy5jb25maWcuYXJlYXMpO1xyXG5cdFx0dGhpcy5oaW50cyA9IG5ldyBDaXJjbGVzTWFuYWdlcih0aGlzKTtcclxuXHRcdHRoaXMudXNlclBhdGggPSBuZXcgUGF0aE1hbmFnZXIodGhpcyk7XHJcblx0XHR0aGlzLmNpcmNsZXMgPSBuZXcgQ2lyY2xlc01hbmFnZXIodGhpcywgdGhpcy5jb25maWcub2JqZWN0cyk7XHJcblx0XHR0aGlzLnVzZXIgPSBuZXcgQ2lyY2xlc01hbmFnZXIodGhpcyk7XHJcblxyXG5cdFx0dGhpcy5nYW1lLmludGVyZmFjZS5zZWxlY3RCdXR0b25zKHtcclxuXHRcdFx0cmVzdGFydDogICEhfnRoaXMuY29uZmlnLmJ1dHRvbnMuaW5kZXhPZignUicpLFxyXG5cdFx0XHRjbG9zZVBhdGg6ICEhfnRoaXMuY29uZmlnLmJ1dHRvbnMuaW5kZXhPZignWicpLFxyXG5cdFx0XHRoaW50OiBmYWxzZVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5nYW1lLmludGVyZmFjZS5oaW50LmNzcygncmlnaHQnLCAhIX50aGlzLmNvbmZpZy5idXR0b25zLmluZGV4T2YoJ1onKSA/IDIxMCA6IDEyMCk7XHJcblxyXG5cdFx0aWYgKHRoaXMuaXNOZXcgJiYgdGhpcy5jb25maWcud2luZG93cykgdGhpcy5uZXh0V2luZG93KCk7XHJcblx0fVxyXG5cdHVwZGF0ZSgpIHtcclxuXHRcdGlmKHRoaXMuY2xpY2tzID49IHRoaXMuY29uZmlnLmNsaWNrcykge1xyXG5cdFx0XHR0aGlzLmdhbWUuaW50ZXJmYWNlLnNlbGVjdEJ1dHRvbnMoe2hpbnQ6IHRydWV9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGNoZWNrTGV2ZWxPdmVyKCkge1xyXG5cdFx0dGhpcy5jaGVja0NvbGxpc2lvbkxpbmVXaXRoQ2lyY2xlKCk7XHJcblx0XHRpZiAodGhpcy5pbnRlcnNlY3Rpb25zTGVmdCA8PSAwKSB7XHJcblx0XHRcdHRoaXMucGxheS5pc0xldmVsT3ZlciA9IHRydWU7XHJcblxyXG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHR0aGlzLmdhbWUubGV2ZWxPdmVyQ2xpY2tzKys7XHJcblx0XHRcdFx0aWYodGhpcy5nYW1lLmxldmVsT3ZlckNsaWNrcyA+IDIpIHtcclxuXHRcdFx0XHRcdHRoaXMuZ2FtZS5hZHMuc2hvdygpO1xyXG5cdFx0XHRcdFx0dGhpcy5nYW1lLmxldmVsT3ZlckNsaWNrcyA9IDA7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnY2xpY2tzJywgMCk7XHJcblx0XHRcdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2N1cnJlbnRIaW50JywgMCk7XHJcblxyXG5cdFx0XHRcdHRoaXMucGxheS5pc0xldmVsT3ZlciA9IGZhbHNlO1xyXG5cdFx0XHRcdHRoaXMucGxheS5uZXh0TGV2ZWwoKTtcclxuXHRcdFx0fSwgMTAwMCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRjaGVja0NvbGxpc2lvbkxpbmVXaXRoQ2lyY2xlKCkge1xyXG5cdFx0dmFyIGxhc3QgPSB0aGlzLnVzZXJQYXRoLnBvaW50cy5sZW5ndGgtMTtcclxuXHJcblx0XHQvL2lmIGNyZWF0ZWQgdXNlciBwb2ludHMgbW9yZSAxXHJcblx0XHRpZiAobGFzdCkge1xyXG5cclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNpcmNsZXMuY2lyY2xlcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHZhciBjaXJjbGUgPSB0aGlzLmNpcmNsZXMuY2lyY2xlc1tpXTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvL3VzZSBsYXN0IHR3byB1c2VyIHBvaW50c1xyXG5cdFx0XHRcdHZhciBwMSA9IHRoaXMudXNlclBhdGgucG9pbnRzW2xhc3RdO1xyXG5cdFx0XHRcdHZhciBwMiA9IHRoaXMudXNlclBhdGgucG9pbnRzW2xhc3QgLSAxXTtcclxuXHJcblx0XHRcdFx0Ly9pZiBjb2xsaXNpb24gdHJ1ZSwgYW5pbWF0aW5nIGN1cnJyZW50IHBvaW50XHJcblx0XHRcdFx0aWYgKGhlbHBlci5nZXRIZWlnaHRUcmlhbmdsZShwMS54LCBwMS55LCBwMi54LCBwMi55LCBjaXJjbGUueCwgY2lyY2xlLnkpIDwgY2lyY2xlLnIpIHtcclxuXHRcdFx0XHRcdGNpcmNsZS5zdGFydENyb3NzQW5pbWF0aW9uKCk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKCFjaXJjbGUuaXNDb2xsaXNpb24pIGNpcmNsZS5jcm9zc0V2ZW50KCk7XHJcblx0XHRcdFx0XHRjaXJjbGUuaXNDb2xsaXNpb24gPSB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0c2hvd0hpbnQoKSB7XHJcblx0XHR0aGlzLmNsaWNrcyA9IE1hdGgubWluKHRoaXMuY2xpY2tzLCB0aGlzLmNvbmZpZy5oaW50cy5sZW5ndGgqdGhpcy5jb25maWcuY2xpY2tzKTtcclxuXHRcdHRoaXMuaGludHMuZGVsZXRlQ2lyY2xlcygpO1xyXG5cclxuXHRcdHRoaXMuY3VycmVudEhpbnQgPSBNYXRoLnJvdW5kKHRoaXMuY2xpY2tzL3RoaXMuY29uZmlnLmNsaWNrcyk7XHJcblx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnY3VycmVudEhpbnQnLCB0aGlzLmN1cnJlbnRIaW50KTtcclxuXHJcblx0XHR2YXIgcG9zO1xyXG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMuY3VycmVudEhpbnQ7IGkrKykge1xyXG5cdFx0XHRwb3MgPSB0aGlzLmNvbmZpZy5oaW50c1tpXTtcclxuXHRcdFx0dGhpcy5oaW50cy5hZGRDaXJjbGUodGhpcy5nYW1lLmNlbnRlclgrcG9zLngsIHRoaXMuZ2FtZS5jZW50ZXJZK3Bvcy55LCAnaGludCcpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuZ2FtZS5pbnRlcmZhY2Uuc2VsZWN0QnV0dG9ucyh7aGludDogdHJ1ZX0pXHJcblx0fVxyXG5cclxuXHRuZXh0V2luZG93KCkge1xyXG5cdFx0dmFyIHdpbmRzID0gdGhpcy5jb25maWcud2luZG93c1t0aGlzLmdhbWUuc2V0dGluZ3MubGFuZ107XHJcblx0XHRpZighd2luZHMgfHwgdGhpcy5jdXJyZW50V2luZG93ID4gd2luZHMubGVuZ3RoIC0gMSkgcmV0dXJuO1xyXG5cclxuXHRcdHRoaXMuZ2FtZS53aW5kb3dNYW5hZ2VyLmFkZFdpbmRvdyh3aW5kc1t0aGlzLmN1cnJlbnRXaW5kb3ddLCAoKSA9PiB0aGlzLm5leHRXaW5kb3coKSk7XHJcblx0XHR0aGlzLmN1cnJlbnRXaW5kb3crKztcclxuXHR9XHJcblxyXG5cdGNsb3NlUGF0aCgpIHtcclxuXHRcdGlmKCF0aGlzLmlzTGV2ZWxDbG9zZVBhdGggJiYgdGhpcy51c2VyLmNpcmNsZXMubGVuZ3RoKSB7XHJcblx0XHRcdHRoaXMuaXNMZXZlbENsb3NlUGF0aCA9IHRydWU7XHJcblx0XHRcdHRoaXMudXNlclBhdGguY2xvc2VQYXRoKCk7XHJcblx0XHRcdHRoaXMuY2hlY2tMZXZlbE92ZXIoKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTGV2ZWw7IiwiY2xhc3MgUGF0aE1hbmFnZXIge1xyXG5cdGNvbnN0cnVjdG9yKGxldmVsKSB7XHJcblx0XHR0aGlzLmxldmVsID0gbGV2ZWw7XHJcblx0XHR0aGlzLmdhbWUgPSB0aGlzLmxldmVsLmdhbWU7XHJcblx0XHR0aGlzLnBhdGggPSB0aGlzLmxldmVsLnN2Zy5wYXRoKCcnKTtcclxuXHRcdHRoaXMucGF0aC5hdHRyKHtcclxuXHRcdFx0ZmlsbDogJ3RyYW5zcGFyZW50JyxcclxuXHRcdFx0c3Ryb2tlOiAnI2ZmZicsXHJcblx0XHRcdHN0cm9rZVdpZHRoOiAzXHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLnBvaW50cyA9IFtdO1xyXG5cdH1cclxuXHRhZGRQb2ludCh4LCB5KSB7XHJcblx0XHR2YXIgZCA9IHRoaXMucGF0aC5hdHRyKCdkJyk7XHJcblx0XHR0aGlzLnBhdGguYXR0cih7XHJcblx0XHRcdGQ6IGAke2R9JHt0aGlzLnBvaW50cy5sZW5ndGggPyAnTCcgOiAnTSd9JHt4fSwke3l9YFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5wb2ludHMucHVzaCh7eCwgeX0pO1xyXG5cdH1cclxuXHRjbG9zZVBhdGgoKSB7XHJcblx0XHR2YXIgZCA9IHRoaXMucGF0aC5hdHRyKCdkJyk7XHJcblx0XHR0aGlzLnBhdGguYXR0cih7XHJcblx0XHRcdGQ6IGAke2R9IFpgXHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmFkZFBvaW50KHRoaXMucG9pbnRzWzBdLngsIHRoaXMucG9pbnRzWzBdLnkpO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQYXRoTWFuYWdlcjsiLCJjbGFzcyBUb3VjaEFyZWEge1xyXG5cdGNvbnN0cnVjdG9yKG1hbmFnZXIsIHgsIHksIHcsIGgpIHtcclxuXHRcdHRoaXMubWFuYWdlciA9IG1hbmFnZXI7XHJcblxyXG5cdFx0dGhpcy5yZWN0ID0gdGhpcy5tYW5hZ2VyLmdyb3VwLnJlY3QoeCwgeSwgdywgaCk7XHJcblx0XHR0aGlzLnJlY3QuYXR0cih7XHJcblx0XHRcdGZpbGw6ICd0cmFuc3BhcmVudCcsXHJcblx0XHRcdHN0cm9rZTogJyNmZmYnLFxyXG5cdFx0XHRzdHJva2VXaWR0aDogNVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy50eXBlID0gJ3RvdWNoJztcclxuXHRcdHRoaXMueCA9IHggfHwgMDtcclxuXHRcdHRoaXMueSA9IHkgfHwgMDtcclxuXHRcdHRoaXMudyA9IHcgfHwgMDtcclxuXHRcdHRoaXMuaCA9IGggfHwgMDtcclxuXHR9XHJcblx0dG91Y2hFdmVudCgpIHtcclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBUb3VjaEFyZWE7IiwiY2xhc3MgVW5jcm9zc0NpcmNsZSB7XHJcblx0Y29uc3RydWN0b3IobWFuYWdlciwgeCwgeSkge1xyXG5cdFx0dGhpcy5tYW5hZ2VyID0gbWFuYWdlcjtcclxuXHRcdFxyXG5cdFx0dGhpcy5jaXJjbGUgPSB0aGlzLm1hbmFnZXIuZ3JvdXAuY2lyY2xlKHgsIHksIDI1KTtcclxuXHRcdHRoaXMuY2lyY2xlLmF0dHIoe1xyXG5cdFx0XHRyOiAyNSxcclxuXHRcdFx0ZmlsbDogJ3JnYmEoMTAzLCA1OCwgMTgzKScsXHJcblx0XHRcdG9wYWNpdHk6IC42MyxcclxuXHRcdFx0c3Ryb2tlV2lkdGg6IDNcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMudHlwZSA9ICd1bmNyb3NzJztcclxuXHRcdHRoaXMueCA9IHg7XHJcblx0XHR0aGlzLnkgPSB5O1xyXG5cdFx0dGhpcy5yID0gMjU7XHJcblxyXG5cdH1cclxuXHRzdGFydENyb3NzQW5pbWF0aW9uKCkge1xyXG5cdFx0dGhpcy5jaXJjbGUuYW5pbWF0ZSh7XHJcblx0XHRcdHI6IDIwLFxyXG5cdFx0XHRmaWxsOiAnI2ZmZidcclxuXHRcdH0sIDUwMCk7XHJcblx0fVxyXG5cdGNyb3NzRXZlbnQoKSB7XHJcblx0XHR0aGlzLm1hbmFnZXIubGV2ZWwuaW50ZXJzZWN0aW9uc0xlZnQgPSAnWCc7XHJcblx0XHR0aGlzLm1hbmFnZXIubGV2ZWwuc3RlcHNMZWZ0ID0gMDtcdFxyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBVbmNyb3NzQ2lyY2xlOyIsImNsYXNzIFVudG91Y2hBcmVhIHtcclxuXHRjb25zdHJ1Y3RvcihtYW5hZ2VyLCB4LCB5LCB3LCBoKSB7XHJcblx0XHR0aGlzLm1hbmFnZXIgPSBtYW5hZ2VyO1xyXG5cclxuXHRcdHRoaXMucmVjdCA9IHRoaXMubWFuYWdlci5ncm91cC5yZWN0KHgsIHksIHcsIGgpO1xyXG5cdFx0dGhpcy5yZWN0LmF0dHIoe1xyXG5cdFx0XHRmaWxsOiAndHJhbnNwYXJlbnQnLFxyXG5cdFx0XHRzdHJva2U6ICcjRkYzNTM1JyxcclxuXHRcdFx0b3BhY2l0eTogMC44LFxyXG5cdFx0XHRzdHJva2VXaWR0aDogNVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy50eXBlID0gJ3VudG91Y2gnO1xyXG5cdFx0dGhpcy54ID0geCB8fCAwO1xyXG5cdFx0dGhpcy55ID0geSB8fCAwO1xyXG5cdFx0dGhpcy53ID0gdyB8fCAwO1xyXG5cdFx0dGhpcy5oID0gaCB8fCAwO1xyXG5cdH1cclxuXHR0b3VjaEV2ZW50KCkge1xyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBVbnRvdWNoQXJlYTsiLCJjbGFzcyBVc2VyQ2lyY2xlIHtcclxuXHRjb25zdHJ1Y3RvcihtYW5hZ2VyLCB4LCB5KSB7XHJcblx0XHR0aGlzLm1hbmFnZXIgPSBtYW5hZ2VyO1xyXG5cdFx0XHJcblx0XHR0aGlzLmNpcmNsZSA9IHRoaXMubWFuYWdlci5ncm91cC5jaXJjbGUoeCwgeSwgMCk7XHJcblx0XHR0aGlzLmNpcmNsZS5hdHRyKHtcclxuXHRcdFx0ZmlsbDogJyNmZmYnXHJcblx0XHR9KTtcclxuXHRcdHRoaXMuY2lyY2xlLmFuaW1hdGUoe1xyXG5cdFx0XHRyOiAyMFxyXG5cdFx0fSwgMTAwMCwgbWluYS5lbGFzdGljKTtcclxuXHJcblx0XHR0aGlzLnR5cGUgPSAndXNlcic7XHJcblx0XHR0aGlzLnIgPSAyMDtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVXNlckNpcmNsZTsiLCJtb2R1bGUuZXhwb3J0cz1bXHJcbiAge1xyXG4gICAgXCJsYWJlbFwiOiBcIkVBU1lcIixcclxuICAgIFwib2JqZWN0c1wiOiBbXHJcbiAgICAgIHtcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxyXG4gICAgICAgIFwieFwiOiAwLFxyXG4gICAgICAgIFwieVwiOiAwXHJcbiAgICAgIH1cclxuICAgIF0sXHJcbiAgICBcInN0ZXBzXCI6IDIsXHJcbiAgICBcImludGVyc2VjdGlvbnNcIjogMSxcclxuICAgIFwiYnV0dG9uc1wiOiBcIlJcIixcclxuICAgIFwid2luZG93c1wiOiB7XHJcbiAgICAgIFwicnVcIjogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIFwibGFiZWxcIjogXCJMSU5FU1wiLFxyXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwi0JIg0LbQuNCy0L7Qv9C40YHQuCwg0LrQsNC6INC4INCyINC80L7RgNCw0LvQuCwg0LPQu9Cw0LLQvdC+0LUg0YHQvtGB0YLQvtC40YIg0LIg0YLQvtC8LCDRh9GC0L7QsdGLINCyINC90YPQttC90L7QvCDQvNC10YHRgtC1INC/0YDQvtCy0LXRgdGC0Lgg0LvQuNC90LjRjiDigJQg0JPQuNC70LHQtdGA0YIg0JrQuNGCINCn0LXRgdGC0LXRgNGC0L7QvVwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBcImxhYmVsXCI6IFwiSU5GT1wiLFxyXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwi0KfRgtC+0LHRiyDQv9C10YDQtdC30LDQs9GA0YPQt9C40YLRjCDQuNCz0YDRgywg0L3QsNC20LzQuNGC0LUgUlwiXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICBcImVuXCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcclxuICAgICAgICAgIFwidGV4dFwiOiBcIkFydCwgbGlrZSBtb3JhbGl0eSwgY29uc2lzdHMgaW4gZHJhd2luZyB0aGUgbGluZSBzb21ld2hlcmUuIOKAlCBHaWxiZXJ0IEtlaXRoIENoZXN0ZXJ0b25cIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgXCJsYWJlbFwiOiBcIklORk9cIixcclxuICAgICAgICAgIFwidGV4dFwiOiBcIlRvIHJlc2V0IHRoZSBnYW1lLCBwcmVzcyBSXCJcclxuICAgICAgICB9XHJcbiAgICAgIF1cclxuICAgIH1cclxuICB9LFxyXG4gIHtcclxuICAgIFwibGFiZWxcIjogXCJJIEFOR1VMVVNcIixcclxuICAgIFwib2JqZWN0c1wiOiBbXHJcbiAgICAgIHtcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxyXG4gICAgICAgIFwieFwiOiAtNzUsXHJcbiAgICAgICAgXCJ5XCI6IC03NVxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcclxuICAgICAgICBcInhcIjogLTc1LFxyXG4gICAgICAgIFwieVwiOiA3NVxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcclxuICAgICAgICBcInhcIjogNzUsXHJcbiAgICAgICAgXCJ5XCI6IC03NVxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcclxuICAgICAgICBcInhcIjogNzUsXHJcbiAgICAgICAgXCJ5XCI6IDc1XHJcbiAgICAgIH1cclxuICAgIF0sXHJcbiAgICBcInN0ZXBzXCI6IDMsXHJcbiAgICBcImludGVyc2VjdGlvbnNcIjogNCxcclxuICAgIFwiYnV0dG9uc1wiOiBcIlJcIixcclxuICAgIFwid2luZG93c1wiOiB7XHJcbiAgICAgIFwicnVcIjogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIFwibGFiZWxcIjogXCJMSU5FU1wiLFxyXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwi0JrQvtC90LXRhiDRg9C20LUg0YHQvtC00LXRgNC20LjRgtGB0Y8g0LIg0L3QsNGH0LDQu9C1LiDigJQg0JTQttC+0YDQtNC2INCe0YDRg9GN0LvQuy4gMTk4NFwiICAgICAgICAgIFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgXCJsYWJlbFwiOiBcIklORk9cIixcclxuICAgICAgICAgIFwidGV4dFwiOiBcItCd0LDQttC80LjRgtC1INC90LAgSCwg0YfRgtC+0LHRiyDQv9C+0LvRg9GH0LjRgtGMINC/0L7QtNGB0LrQsNC30LrRgywg0LrQvtCz0LTQsCDQvtC90LAg0L/QvtGP0LLQuNGC0YHRj1wiXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICBcImVuXCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcclxuICAgICAgICAgIFwidGV4dFwiOiBcIlRoZSBlbmQgaXMgYWxyZWFkeSBjb250YWluZWQgaW4gdGhlIGJlZ2lubmluZy4gLSBHZW9yZ2UgT3J3ZWxsLiAxOTg0XCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIFwibGFiZWxcIjogXCJJTkZPXCIsXHJcbiAgICAgICAgICBcInRleHRcIjogXCJQcmVzcyBILCB0byBnZXQgYSBjbHVlIHdoZW4gaXQgYXBwZWFyc1wiXHJcbiAgICAgICAgfVxyXG4gICAgICBdXHJcbiAgICB9LFxyXG4gICAgXCJjbGlja3NcIjogMTgsXHJcbiAgICBcImhpbnRzXCI6IFtcclxuICAgICAge1wieFwiOiAyNTAsIFwieVwiOiAtMTI1fSxcclxuICAgICAge1wieFwiOiAtMzUwLCBcInlcIjogMH0sXHJcbiAgICAgIHtcInhcIjogMjUwLCBcInlcIjogMTI1fVxyXG4gICAgXVxyXG4gIH0sXHJcbiAge1xyXG4gICAgXCJsYWJlbFwiOiBcIlYgYW5kIElYXCIsXHJcbiAgICBcImludGVyc2VjdGlvbnNcIjogOSxcclxuICAgIFwic3RlcHNcIjogNCxcclxuICAgIFwiY2xpY2tzXCI6IDUwLFxyXG4gICAgXCJvYmplY3RzXCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiA5NSxcclxuICAgICAgICAgICAgXCJ5XCI6IDk1LFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAwLFxyXG4gICAgICAgICAgICBcInlcIjogOTUsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC05NSxcclxuICAgICAgICAgICAgXCJ5XCI6IDk1LFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtOTUsXHJcbiAgICAgICAgICAgIFwieVwiOiAwLFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAwLFxyXG4gICAgICAgICAgICBcInlcIjogMCxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogOTUsXHJcbiAgICAgICAgICAgIFwieVwiOiAwLFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiA5NSxcclxuICAgICAgICAgICAgXCJ5XCI6IC05NSxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogMCxcclxuICAgICAgICAgICAgXCJ5XCI6IC05NSxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTk1LFxyXG4gICAgICAgICAgICBcInlcIjogLTk1LFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfVxyXG4gICAgXSxcclxuICAgIFwiaGludHNcIjogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC0yNjguNSxcclxuICAgICAgICAgICAgXCJ5XCI6IDE0MS41XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAzMzEuNSxcclxuICAgICAgICAgICAgXCJ5XCI6IDQxLjVcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC0yNjguNSxcclxuICAgICAgICAgICAgXCJ5XCI6IC01OC41XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAzMzEuNSxcclxuICAgICAgICAgICAgXCJ5XCI6IC0xNTguNVxyXG4gICAgICAgIH1cclxuICAgIF0sXHJcbiAgICBcImJ1dHRvbnNcIjogXCJSXCIsXHJcbiAgICBcImFyZWFzXCI6IG51bGwsXHJcbiAgICBcImhpbnRSVVwiOiBudWxsLFxyXG4gICAgXCJoaW50VVNcIjogbnVsbFxyXG4gIH0sXHJcbiAge1xyXG4gICAgXCJsYWJlbFwiOiBcIklJSSBJTiBBIFJPV1wiLFxyXG4gICAgXCJvYmplY3RzXCI6IFtcclxuICAgICAge1xyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXHJcbiAgICAgICAgXCJ4XCI6IC01MCxcclxuICAgICAgICBcInlcIjogLTUwXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxyXG4gICAgICAgIFwieFwiOiAwLFxyXG4gICAgICAgIFwieVwiOiAtNTBcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXHJcbiAgICAgICAgXCJ4XCI6IDUwLFxyXG4gICAgICAgIFwieVwiOiAtNTBcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXHJcbiAgICAgICAgXCJ4XCI6IC01MCxcclxuICAgICAgICBcInlcIjogMFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcclxuICAgICAgICBcInhcIjogMCxcclxuICAgICAgICBcInlcIjogMFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcclxuICAgICAgICBcInhcIjogNTAsXHJcbiAgICAgICAgXCJ5XCI6IDBcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXHJcbiAgICAgICAgXCJ4XCI6IC01MCxcclxuICAgICAgICBcInlcIjogNTBcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXHJcbiAgICAgICAgXCJ4XCI6IDAsXHJcbiAgICAgICAgXCJ5XCI6IDUwXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxyXG4gICAgICAgIFwieFwiOiA1MCxcclxuICAgICAgICBcInlcIjogNTBcclxuICAgICAgfSxcclxuICAgIF0sXHJcbiAgICBcInN0ZXBzXCI6IDIsXHJcbiAgICBcImludGVyc2VjdGlvbnNcIjogNSxcclxuICAgIFwiYnV0dG9uc1wiOiBcIlJcIixcclxuICAgIFwid2luZG93c1wiOiB7XHJcbiAgICAgIFwiZW5cIjogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIFwibGFiZWxcIjogXCJMSU5FU1wiLFxyXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwiRG8gbm90IGxvc2Ugbm90IG9uZSB3aG8ga25vd3MgYWxsIHRoZSBvcHRpb25zIG9mIHZpY3RvcnksIGJ1dCB0aGUgb25lIHdobyBrbm93cyBhbGwgdGhlIG9wdGlvbnMgZGVmZWF0LiDigJQgSGFyb3VuIEFnYXRzYXJza3lcIlxyXG4gICAgICAgIH1cclxuICAgICAgXSxcclxuICAgICAgXCJydVwiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXHJcbiAgICAgICAgICBcInRleHRcIjogXCLQndC1INC/0YDQvtC40LPRgNGL0LLQsNC10YIg0L3QtSDRgtC+0YIsINC60YLQviDQt9C90LDQtdGCINCy0YHQtSDQstCw0YDQuNCw0L3RgtGLINC/0L7QsdC10LTRiywg0LAg0YLQvtGCLCDQutGC0L4g0LfQvdCw0LXRgiDQstGB0LUg0LLQsNGA0LjQsNC90YLRiyDQv9C+0YDQsNC20LXQvdC40Y8uIOKAlCDQk9Cw0YDRg9C9INCQ0LPQsNGG0LDRgNGB0LrQuNC5XCJcclxuICAgICAgICB9XHJcbiAgICAgIF1cclxuICAgIH0sXHJcbiAgICBcImNsaWNrc1wiOiAyMixcclxuICAgIFwiaGludHNcIjogW1xyXG4gICAgICB7XCJ4XCI6IC0xMDAsIFwieVwiOiAxMDB9LFxyXG4gICAgICB7XCJ4XCI6IDYwLCBcInlcIjogLTEwMH1cclxuICAgIF1cclxuICB9LFxyXG4gIHtcclxuICAgIFwibGFiZWxcIjogXCJDT05JVU5DVElTXCIsXHJcbiAgICBcImludGVyc2VjdGlvbnNcIjogNCxcclxuICAgIFwic3RlcHNcIjogMyxcclxuICAgIFwiY2xpY2tzXCI6IDUwLFxyXG4gICAgXCJvYmplY3RzXCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtMjMwLFxyXG4gICAgICAgICAgICBcInlcIjogLTgwLFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAyMjAsXHJcbiAgICAgICAgICAgIFwieVwiOiAtODAsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IDI3MCxcclxuICAgICAgICAgICAgXCJ5XCI6IDIwLFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtMjgwLFxyXG4gICAgICAgICAgICBcInlcIjogMjAsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgICB9XHJcbiAgICBdLFxyXG4gICAgXCJoaW50c1wiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTUsXHJcbiAgICAgICAgICAgIFwieVwiOiAtMzBcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC0xMzAsXHJcbiAgICAgICAgICAgIFwieVwiOiAtNVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogMTIwLFxyXG4gICAgICAgICAgICBcInlcIjogLTVcclxuICAgICAgICB9XHJcbiAgICBdLFxyXG4gICAgXCJhcmVhc1wiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTE4OSxcclxuICAgICAgICAgICAgXCJ5XCI6IC0xMTksXHJcbiAgICAgICAgICAgIFwid1wiOiAzNjgsXHJcbiAgICAgICAgICAgIFwiaFwiOiAyMDgsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInRvdWNoXCJcclxuICAgICAgICB9XHJcbiAgICBdLFxyXG4gICAgXCJidXR0b25zXCI6IFwiUlwiLFxyXG4gICAgXCJ3aW5kb3dzXCI6IHtcclxuICAgICAgXCJydVwiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXHJcbiAgICAgICAgICBcInRleHRcIjogXCLQldGB0LvQuCDQsdGLINC+0YLRgNC10LfQvtC6INC90LUg0YHRh9C40YLQsNC7INGB0LXQsdGPINCx0LXRgdC60L7QvdC10YfQvdC+0Lkg0L/RgNGP0LzQvtC5LCDQvtC9INCy0YDRj9C0INC70Lgg0LHRiyDQtNC+0YLRj9C90YPQuyDQvtGCINC+0LTQvdC+0Lkg0LTQviDQtNGA0YPQs9C+0Lkg0YLQvtGH0LrQuCDigJQg0KTQtdC70LjQutGBINCa0YDQuNCy0LjQvVwiXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICBcImVuXCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcclxuICAgICAgICAgIFwidGV4dFwiOiBcIklmIHRoZSBsaW5lIHNlZ21lbnQgaXMgbm90IGNvbnNpZGVyZWQgaGltc2VsZiBhbiBpbmZpbml0ZSBzdHJhaWdodCBsaW5lLCBoZSBpcyB1bmxpa2VseSB0byByZWFjaCBmcm9tIG9uZSB0byBhbm90aGVyIHBvaW50IOKAlCBGZWxpeCBLcml2aW5lXCJcclxuICAgICAgICB9XHJcbiAgICAgIF1cclxuICAgIH1cclxuICB9LFxyXG4gIHtcclxuICAgIFwibGFiZWxcIjogXCJSQVRTXCIsXHJcbiAgICBcImludGVyc2VjdGlvbnNcIjogOCxcclxuICAgIFwic3RlcHNcIjogNSxcclxuICAgIFwib2JqZWN0c1wiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTIzMCxcclxuICAgICAgICAgICAgXCJ5XCI6IC0zMCxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogMjIwLFxyXG4gICAgICAgICAgICBcInlcIjogLTMwLFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtMzAsXHJcbiAgICAgICAgICAgIFwieVwiOiAtMjMwLFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAyMCxcclxuICAgICAgICAgICAgXCJ5XCI6IC0yMzAsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC0xMDAsXHJcbiAgICAgICAgICAgIFwieVwiOiAyNjAsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IDEwMCxcclxuICAgICAgICAgICAgXCJ5XCI6IDI2MCxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTEzNSxcclxuICAgICAgICAgICAgXCJ5XCI6IDIyNSxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogMTM1LFxyXG4gICAgICAgICAgICBcInlcIjogMjI1LFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfVxyXG4gICAgXSxcclxuICAgIFwiY2xpY2tzXCI6IDUwLFxyXG4gICAgXCJoaW50c1wiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogMTQ1LFxyXG4gICAgICAgICAgICBcInlcIjogMjBcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC04MCxcclxuICAgICAgICAgICAgXCJ5XCI6IDE3MFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTUsXHJcbiAgICAgICAgICAgIFwieVwiOiAtMTgwXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiA3MCxcclxuICAgICAgICAgICAgXCJ5XCI6IDE3MFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTE1NSxcclxuICAgICAgICAgICAgXCJ5XCI6IDIwXHJcbiAgICAgICAgfVxyXG4gICAgXSxcclxuICAgIFwiYXJlYXNcIjogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC0xNzUsXHJcbiAgICAgICAgICAgIFwieVwiOiAtMTc1LFxyXG4gICAgICAgICAgICBcIndcIjogMzUwLFxyXG4gICAgICAgICAgICBcImhcIjogMzUwLFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ0b3VjaFwiXHJcbiAgICAgICAgfVxyXG4gICAgXSxcclxuICAgIFwiYnV0dG9uc1wiOiBcIlJcIixcclxuICAgIFwid2luZG93c1wiOiB7XHJcbiAgICAgIFwicnVcIjogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIFwibGFiZWxcIjogXCJMSU5FU1wiLFxyXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwi0J3QsNGH0LjQvdCw0Y8g0YEg0L7Qv9GA0LXQtNC10LvQtdC90L3QvtC5INGC0L7Rh9C60LgsINCy0L7Qt9Cy0YDQsNGCINGD0LbQtSDQvdC10LLQvtC30LzQvtC20LXQvS4g0K3RgtC+0Lkg0YLQvtGH0LrQuCDQvdCw0LTQviDQtNC+0YHRgtC40YfRjC4g4oCUINCk0YDQsNC90YYg0JrQsNGE0LrQsFwiXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICBcImVuXCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcclxuICAgICAgICAgIFwidGV4dFwiOiBcIlRoZXJlIGlzIGEgcG9pbnQgb2Ygbm8gcmV0dXJuLiBUaGlzIHBvaW50IGhhcyB0byBiZSByZWFjaGVkLiDigJQgRnJhbnogS2Fma2FcIlxyXG4gICAgICAgIH1cclxuICAgICAgXVxyXG4gICAgfVxyXG4gIH0sXHJcbiAge1xyXG4gICAgXCJsYWJlbFwiOiBcIlRSSUdPTlVTXCIsXHJcbiAgICBcImNsaWNrc1wiOiA1MCxcclxuICAgIFwib2JqZWN0c1wiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTE4MCxcclxuICAgICAgICAgICAgXCJ5XCI6IC01LFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtMTMwLFxyXG4gICAgICAgICAgICBcInlcIjogLTU1LFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAxNzAsXHJcbiAgICAgICAgICAgIFwieVwiOiA0NSxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogNzAsXHJcbiAgICAgICAgICAgIFwieVwiOiAtNTUsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IDEyMCxcclxuICAgICAgICAgICAgXCJ5XCI6IDk1LFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtODAsXHJcbiAgICAgICAgICAgIFwieVwiOiA5NSxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICAgIH1cclxuICAgIF0sXHJcbiAgICBcImhpbnRzXCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtMjgwLFxyXG4gICAgICAgICAgICBcInlcIjogOTVcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC0zMCxcclxuICAgICAgICAgICAgXCJ5XCI6IC0xNTVcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IDIyMCxcclxuICAgICAgICAgICAgXCJ5XCI6IDk1XHJcbiAgICAgICAgfVxyXG4gICAgXSxcclxuICAgIFwic3RlcHNcIjogMyxcclxuICAgIFwiaW50ZXJzZWN0aW9uc1wiOiA2LFxyXG4gICAgXCJhcmVhc1wiOiBbXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogLTMwMCxcclxuICAgICAgICBcIndcIjogNjAwLFxyXG4gICAgICAgIFwieVwiOiAtMTYwLFxyXG4gICAgICAgIFwiaFwiOiAzNDAsXHJcbiAgICAgICAgXCJ0eXBlXCI6IFwidG91Y2hcIlxyXG4gICAgICB9XHJcbiAgICBdLFxyXG4gICAgXCJidXR0b25zXCI6IFwiUiBaXCIsXHJcbiAgICBcIndpbmRvd3NcIjoge1xyXG4gICAgICBcInJ1XCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcclxuICAgICAgICAgIFwidGV4dFwiOiBcItCa0L7Qs9C00LAg0L/QvtGA0LAg0LLQvtC30LLRgNCw0YnQsNGC0YzRgdGPLCDRgdGD0LTRjNCx0LAg0L3QsNC50LTQtdGCINGB0L/QvtGB0L7QsSDRgtC10LHRjyDQstC10YDQvdGD0YLRjC4g4oCUINCh0LDRgNCwINCU0LbQuNC+LiDQpNC40LDQu9C60Lgg0LIg0LzQsNGA0YLQtVwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBcImxhYmVsXCI6IFwiSU5GT1wiLFxyXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwi0KfRgtC+0LHRiyDQt9Cw0LzQutC90YPRgtGMINGC0L7Rh9C60Lgg0LvQuNC90LjQtdC5LCDQvdCw0LbQvNC40YLQtSBaXCJcclxuICAgICAgICB9XHJcbiAgICAgIF0sXHJcbiAgICAgIFwiZW5cIjogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIFwibGFiZWxcIjogXCJMSU5FU1wiLFxyXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwiRmF0ZSBoYXMgYSB3YXkgb2YgYnJpbmdpbmcgeW91IGJhY2sgd2hlbiBpdCdzIHRpbWUgdG8gY29tZSBiYWNrIOKAlCBTYXJhaCBKaW8uIFRoZSBWaW9sZXRzIG9mIE1hcmNoXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIFwibGFiZWxcIjogXCJJTkZPXCIsXHJcbiAgICAgICAgICBcInRleHRcIjogXCJUbyBjbG9zZSB0aGUgbGluZSBwb2ludHMsIHByZXNzIFpcIlxyXG4gICAgICAgIH1cclxuICAgICAgXVxyXG4gICAgfVxyXG4gIH0sXHJcbiAge1xyXG4gICAgXCJsYWJlbFwiOiBcIkJFQVJcIixcclxuICAgIFwic3RlcHNcIjogMyxcclxuICAgIFwiaW50ZXJzZWN0aW9uc1wiOiA2LFxyXG4gICAgXCJjbGlja3NcIjogNTAsXHJcbiAgICBcImJ1dHRvbnNcIjogXCJSIFpcIixcclxuICAgIFwib2JqZWN0c1wiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTEzMCxcclxuICAgICAgICAgICAgXCJ5XCI6IDcwLFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiA0NSxcclxuICAgICAgICAgICAgXCJ5XCI6IDQ1LFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAyNDUsXHJcbiAgICAgICAgICAgIFwieVwiOiAxOTUsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IDI5NSxcclxuICAgICAgICAgICAgXCJ5XCI6IDcwLFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtMzA1LFxyXG4gICAgICAgICAgICBcInlcIjogLTU1LFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiA3MCxcclxuICAgICAgICAgICAgXCJ5XCI6IDE3MCxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICAgIH1cclxuICAgIF0sXHJcbiAgICBcImhpbnRzXCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAyNDUsXHJcbiAgICAgICAgICAgIFwieVwiOiAyMjBcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC0zMzAsXHJcbiAgICAgICAgICAgIFwieVwiOiAtMzBcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IDcwLFxyXG4gICAgICAgICAgICBcInlcIjogNDVcclxuICAgICAgICB9XHJcbiAgICBdLFxyXG4gICAgXCJhcmVhc1wiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTMzOSxcclxuICAgICAgICAgICAgXCJ5XCI6IC05MSxcclxuICAgICAgICAgICAgXCJ3XCI6IDY5LFxyXG4gICAgICAgICAgICBcImhcIjogNzAsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInRvdWNoXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IDEwLFxyXG4gICAgICAgICAgICBcInlcIjogMTEsXHJcbiAgICAgICAgICAgIFwid1wiOiA3MSxcclxuICAgICAgICAgICAgXCJoXCI6IDY4LFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ0b3VjaFwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAyMTIsXHJcbiAgICAgICAgICAgIFwieVwiOiAxNjMsXHJcbiAgICAgICAgICAgIFwid1wiOiA2NyxcclxuICAgICAgICAgICAgXCJoXCI6IDY2LFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ0b3VjaFwiXHJcbiAgICAgICAgfVxyXG4gICAgXSxcclxuICAgIFwiaGludFJVXCI6IG51bGwsXHJcbiAgICBcImhpbnRVU1wiOiBudWxsLFxyXG4gICAgXCJuZXdcIjogdHJ1ZVxyXG4gIH0sXHJcbiAge1xyXG4gICAgXCJsYWJlbFwiOiBcIkJBQ0tXQVJEU1wiLFxyXG4gICAgXCJjbGlja3NcIjogNTAsXHJcbiAgICBcImhpbnRzXCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtODAsXHJcbiAgICAgICAgICAgIFwieVwiOiA3MFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTUsXHJcbiAgICAgICAgICAgIFwieVwiOiAtMTU1XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiA5NSxcclxuICAgICAgICAgICAgXCJ5XCI6IC0xNTVcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IDQ1LFxyXG4gICAgICAgICAgICBcInlcIjogMTIwXHJcbiAgICAgICAgfVxyXG4gICAgXSxcclxuICAgIFwib2JqZWN0c1wiOiBbXHJcbiAgICAgIHtcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxyXG4gICAgICAgIFwieFwiOiAtNTAsXHJcbiAgICAgICAgXCJ5XCI6IDBcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXHJcbiAgICAgICAgXCJ4XCI6IDEwMCxcclxuICAgICAgICBcInlcIjogLTEwMFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcclxuICAgICAgICBcInhcIjogNTAsXHJcbiAgICAgICAgXCJ5XCI6IDUwXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxyXG4gICAgICAgIFwieFwiOiA1MCxcclxuICAgICAgICBcInlcIjogMjUwXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxyXG4gICAgICAgIFwieFwiOiAtMTUwLFxyXG4gICAgICAgIFwieVwiOiAyNTBcclxuICAgICAgfVxyXG4gICAgXSxcclxuICAgIFwiYXJlYXNcIjogW1xyXG4gICAgICB7XHJcbiAgICAgICAgXCJ4XCI6IC0xMjUsXHJcbiAgICAgICAgXCJ3XCI6IDMyNSxcclxuICAgICAgICBcInlcIjogLTE2MCxcclxuICAgICAgICBcImhcIjogMzAwLFxyXG4gICAgICAgIFwidHlwZVwiOiBcInRvdWNoXCJcclxuICAgICAgfVxyXG4gICAgXSxcclxuICAgIFwic3RlcHNcIjogNCxcclxuICAgIFwiaW50ZXJzZWN0aW9uc1wiOiA1LFxyXG4gICAgXCJidXR0b25zXCI6IFwiUiBaXCIsXHJcbiAgICBcIndpbmRvd3NcIjoge1xyXG4gICAgICBcInJ1XCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcclxuICAgICAgICAgIFwidGV4dFwiOiBcItCc0Ysg0L3QtSDQvtGC0YHRgtGD0L/QsNC10Lwg4oCUINC80Ysg0LjQtNC10Lwg0LIg0LTRgNGD0LPQvtC8INC90LDQv9GA0LDQstC70LXQvdC40LguIOKAlCDQlNGD0LPQu9Cw0YEg0JzQsNC60LDRgNGC0YPRgFwiXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICBcImVuXCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcclxuICAgICAgICAgIFwidGV4dFwiOiBcIldlIGFyZSBub3QgcmV0cmVhdGluZyAtIHdlIGFyZSBnb2luZyBpbiB0aGUgb3RoZXIgZGlyZWN0aW9uIOKAlCBEb3VnbGFzIE1hY0FydGh1clwiXHJcbiAgICAgICAgfVxyXG4gICAgICBdXHJcbiAgICB9XHJcbiAgfSxcclxuICB7XHJcbiAgICBcImxhYmVsXCI6IFwiTUFMVU1cIixcclxuICAgIFwiY2xpY2tzXCI6IDUsXHJcbiAgICBcIm9iamVjdHNcIjogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC01LFxyXG4gICAgICAgICAgICBcInlcIjogLTUsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IDQ1LFxyXG4gICAgICAgICAgICBcInlcIjogLTUsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTU1LFxyXG4gICAgICAgICAgICBcInlcIjogLTUsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTUsXHJcbiAgICAgICAgICAgIFwieVwiOiAtNTUsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTUsXHJcbiAgICAgICAgICAgIFwieVwiOiA0NSxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXHJcbiAgICAgICAgfVxyXG4gICAgXSxcclxuICAgIFwiaGludHNcIjogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC01NSxcclxuICAgICAgICAgICAgXCJ5XCI6IDQ1XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiA0NSxcclxuICAgICAgICAgICAgXCJ5XCI6IC01NVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTU1LFxyXG4gICAgICAgICAgICBcInlcIjogLTU1XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiA0NSxcclxuICAgICAgICAgICAgXCJ5XCI6IDQ1XHJcbiAgICAgICAgfVxyXG4gICAgXSxcclxuICAgIFwic3RlcHNcIjogMixcclxuICAgIFwiaW50ZXJzZWN0aW9uc1wiOiAxLFxyXG4gICAgXCJidXR0b25zXCI6IFwiUiBaXCIsXHJcbiAgICBcIndpbmRvd3NcIjoge1xyXG4gICAgICBcInJ1XCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBcImxhYmVsXCI6IFwiTElORVNcIixcclxuICAgICAgICAgIFwidGV4dFwiOiBcItCc0Ysg0LfQsNC80LXRh9Cw0LXQvCDQv9GA0LXQv9GP0YLRgdGC0LLQuNGPLCDQutC+0LPQtNCwINC+0YLRgNGL0LLQsNC10Lwg0LLQt9Cz0LvRj9C0INC+0YIg0YbQtdC70LguIOKAlCDQlNC20L7Qt9C10YQg0JrQvtGB0YHQvNCw0L1cIlxyXG4gICAgICAgIH1cclxuICAgICAgXSxcclxuICAgICAgXCJlblwiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXHJcbiAgICAgICAgICBcInRleHRcIjogXCJXZSBub3RpY2UgdGhlIG9ic3RhY2xlcywgd2hlbiB3ZSBkbyBub3QgbG9vayBhdCB0aGUgZ29hbC4g4oCUIEpvc2VwaCBLb3NzbWFuXCJcclxuICAgICAgICB9XHJcbiAgICAgIF1cclxuICAgIH1cclxuICB9LFxyXG4gIHtcclxuICAgIFwibGFiZWxcIjogXCJJSUlcIixcclxuICAgIFwiY2xpY2tzXCI6IDMwLFxyXG4gICAgXCJvYmplY3RzXCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtMTU1LFxyXG4gICAgICAgICAgICBcInlcIjogNDUsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC04MCxcclxuICAgICAgICAgICAgXCJ5XCI6IC0zMCxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTUsXHJcbiAgICAgICAgICAgIFwieVwiOiAtMTA1LFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiA3MCxcclxuICAgICAgICAgICAgXCJ5XCI6IC0zMCxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogMTQ1LFxyXG4gICAgICAgICAgICBcInlcIjogNDUsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC01LFxyXG4gICAgICAgICAgICBcInlcIjogMTcwLFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtNSxcclxuICAgICAgICAgICAgXCJ5XCI6IC0zMCxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiA3MCxcclxuICAgICAgICAgICAgXCJ5XCI6IDk1LFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC04MCxcclxuICAgICAgICAgICAgXCJ5XCI6IDk1LFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC01LFxyXG4gICAgICAgICAgICBcInlcIjogNDUsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogNzAsXHJcbiAgICAgICAgICAgIFwieVwiOiAtMTU1LFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC04MCxcclxuICAgICAgICAgICAgXCJ5XCI6IC0xNTUsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxyXG4gICAgICAgIH1cclxuICAgIF0sXHJcbiAgICBcImhpbnRzXCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtMjU1LFxyXG4gICAgICAgICAgICBcInlcIjogMTcwXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAyMCxcclxuICAgICAgICAgICAgXCJ5XCI6IC0xODBcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IDE5NSxcclxuICAgICAgICAgICAgXCJ5XCI6IDE3MFxyXG4gICAgICAgIH1cclxuICAgIF0sXHJcbiAgICBcInN0ZXBzXCI6IDMsXHJcbiAgICBcImludGVyc2VjdGlvbnNcIjogNixcclxuICAgIFwiYnV0dG9uc1wiOiBcIlJaXCIsXHJcbiAgICBcImFyZWFzXCI6IG51bGxcclxuICB9LFxyXG4gIHtcclxuICAgIFwibGFiZWxcIjogXCJFQVpZP1wiLFxyXG4gICAgXCJvYmplY3RzXCI6IFtcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiAtNDMsXHJcbiAgICAgICAgXCJ5XCI6IC00OCxcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogLTQyLFxyXG4gICAgICAgIFwieVwiOiAtOCxcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogLTQxLFxyXG4gICAgICAgIFwieVwiOiAyOSxcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogLTQwLFxyXG4gICAgICAgIFwieVwiOiA3MCxcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogLTM5LFxyXG4gICAgICAgIFwieVwiOiAxMTIsXHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ4XCI6IC00NCxcclxuICAgICAgICBcInlcIjogLTgzLFxyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiAtMTksXHJcbiAgICAgICAgXCJ5XCI6IC0zOCxcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogLTIsXHJcbiAgICAgICAgXCJ5XCI6IC03LFxyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiAxOCxcclxuICAgICAgICBcInlcIjogMjMsXHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ4XCI6IDQwLFxyXG4gICAgICAgIFwieVwiOiA1MSxcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogNTcsXHJcbiAgICAgICAgXCJ5XCI6IDg2LFxyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiA3OCxcclxuICAgICAgICBcInlcIjogMTE0LFxyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiA4NCxcclxuICAgICAgICBcInlcIjogODAsXHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ4XCI6IDg2LFxyXG4gICAgICAgIFwieVwiOiA0OSxcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogODcsXHJcbiAgICAgICAgXCJ5XCI6IDIwLFxyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiA4NyxcclxuICAgICAgICBcInlcIjogLTEzLFxyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiA4NyxcclxuICAgICAgICBcInlcIjogLTQ3LFxyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiAxMzksXHJcbiAgICAgICAgXCJ5XCI6IC04NCxcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogMTc0LFxyXG4gICAgICAgIFwieVwiOiAtODUsXHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ4XCI6IDIyMCxcclxuICAgICAgICBcInlcIjogLTg1LFxyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiAxMjUsXHJcbiAgICAgICAgXCJ5XCI6IDIsXHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ4XCI6IDE2MCxcclxuICAgICAgICBcInlcIjogNSxcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogMTk4LFxyXG4gICAgICAgIFwieVwiOiA3LFxyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiAyMjcsXHJcbiAgICAgICAgXCJ5XCI6IDcsXHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ4XCI6IDExNSxcclxuICAgICAgICBcInlcIjogMTA4LFxyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiAxNTYsXHJcbiAgICAgICAgXCJ5XCI6IDExMixcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogMjAxLFxyXG4gICAgICAgIFwieVwiOiAxMTAsXHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ4XCI6IDIzNCxcclxuICAgICAgICBcInlcIjogMTEzLFxyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiA5MixcclxuICAgICAgICBcInlcIjogLTg1LFxyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiAzOTQsXHJcbiAgICAgICAgXCJ5XCI6IC01MixcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogMzY0LFxyXG4gICAgICAgIFwieVwiOiAtNzYsXHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ4XCI6IDMyMCxcclxuICAgICAgICBcInlcIjogLTY1LFxyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiAzMDUsXHJcbiAgICAgICAgXCJ5XCI6IC0yMixcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogMzI1LFxyXG4gICAgICAgIFwieVwiOiAxMyxcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogMzY5LFxyXG4gICAgICAgIFwieVwiOiAzNSxcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogMzkwLFxyXG4gICAgICAgIFwieVwiOiA3MyxcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogMzcxLFxyXG4gICAgICAgIFwieVwiOiAxMTYsXHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ4XCI6IDMyOSxcclxuICAgICAgICBcInlcIjogMTMxLFxyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiAyOTgsXHJcbiAgICAgICAgXCJ5XCI6IDEyMyxcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogLTI1NyxcclxuICAgICAgICBcInlcIjogLTkwLFxyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiAtMjU3LFxyXG4gICAgICAgIFwieVwiOiAtNTQsXHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ4XCI6IC0yNTgsXHJcbiAgICAgICAgXCJ5XCI6IC0xMyxcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogLTI1NyxcclxuICAgICAgICBcInlcIjogMjQsXHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ4XCI6IC0yNTksXHJcbiAgICAgICAgXCJ5XCI6IDU1LFxyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiAtMjYwLFxyXG4gICAgICAgIFwieVwiOiAxMDIsXHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ4XCI6IC0yMTQsXHJcbiAgICAgICAgXCJ5XCI6IDEwNCxcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogLTE3MyxcclxuICAgICAgICBcInlcIjogMTA1LFxyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiAtMTI4LFxyXG4gICAgICAgIFwieVwiOiA3MixcclxuICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiAtMTI4LFxyXG4gICAgICAgIFwieVwiOiA0MSxcclxuICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiAtMTI3LFxyXG4gICAgICAgIFwieVwiOiAxMixcclxuICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiAtMTI1LFxyXG4gICAgICAgIFwieVwiOiAtMjEsXHJcbiAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInhcIjogLTEyNCxcclxuICAgICAgICBcInlcIjogLTU2LFxyXG4gICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ4XCI6IC0xMjMsXHJcbiAgICAgICAgXCJ5XCI6IC05MSxcclxuICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwieFwiOiAtMTMxLFxyXG4gICAgICAgIFwieVwiOiAxMTEsXHJcbiAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXHJcbiAgICAgIH1cclxuICAgIF0sXHJcbiAgICBcImNsaWNrc1wiOiA1MCxcclxuICAgIFwiaGludHNcIjogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IDk1LFxyXG4gICAgICAgICAgICBcInlcIjogMTQ1XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAxMjAsXHJcbiAgICAgICAgICAgIFwieVwiOiAtMTA1XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtMTgwLFxyXG4gICAgICAgICAgICBcInlcIjogLTIzMFxyXG4gICAgICAgIH1cclxuICAgIF0sXHJcbiAgICBcInN0ZXBzXCI6IDMsXHJcbiAgICBcImludGVyc2VjdGlvbnNcIjogMjAsXHJcbiAgICBcImJ1dHRvbnNcIjogXCJSWlwiLFxyXG4gICAgXCJhcmVhc1wiOiBudWxsLFxyXG4gICAgXCJoaW50UlVcIjogbnVsbCxcclxuICAgIFwiaGludFVTXCI6IG51bGwsXHJcbiAgICBcIm5ld1wiOiB0cnVlXHJcbiAgfSxcclxuICB7XHJcbiAgICBcImxhYmVsXCI6IFwiQ0hBT1NcIixcclxuICAgIFwiY2xpY2tzXCI6IDUwLFxyXG4gICAgXCJvYmplY3RzXCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtMjA1LFxyXG4gICAgICAgICAgICBcInlcIjogLTE1NSxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogOTUsXHJcbiAgICAgICAgICAgIFwieVwiOiAyMCxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogMTQ1LFxyXG4gICAgICAgICAgICBcInlcIjogLTgwLFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAyMjAsXHJcbiAgICAgICAgICAgIFwieVwiOiAtMTU1LFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtMzAsXHJcbiAgICAgICAgICAgIFwieVwiOiA0NSxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTMwLFxyXG4gICAgICAgICAgICBcInlcIjogLTEzMCxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTEzMCxcclxuICAgICAgICAgICAgXCJ5XCI6IC0xNTUsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC0yMzksXHJcbiAgICAgICAgICAgIFwieVwiOiA5OCxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogMTk1LFxyXG4gICAgICAgICAgICBcInlcIjogOTUsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogMTIwLFxyXG4gICAgICAgICAgICBcInlcIjogMTQ1LFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC0yODAsXHJcbiAgICAgICAgICAgIFwieVwiOiAyMCxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtMjA1LFxyXG4gICAgICAgICAgICBcInlcIjogMTcwLFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC0xMzAsXHJcbiAgICAgICAgICAgIFwieVwiOiAxOTUsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTI4MCxcclxuICAgICAgICAgICAgXCJ5XCI6IDE5NSxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtMzA0LFxyXG4gICAgICAgICAgICBcInlcIjogNzgsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTEwNSxcclxuICAgICAgICAgICAgXCJ5XCI6IDEyMCxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiA5NSxcclxuICAgICAgICAgICAgXCJ5XCI6IC0xNTUsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogMTcwLFxyXG4gICAgICAgICAgICBcInlcIjogLTIzMCxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAyMCxcclxuICAgICAgICAgICAgXCJ5XCI6IC0yMzAsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTEwNSxcclxuICAgICAgICAgICAgXCJ5XCI6IC0zMCxcclxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtMjMwLFxyXG4gICAgICAgICAgICBcInlcIjogLTgwLFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtMjMwLFxyXG4gICAgICAgICAgICBcInlcIjogMjAsXHJcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogMjQ1LFxyXG4gICAgICAgICAgICBcInlcIjogLTU1LFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC01LFxyXG4gICAgICAgICAgICBcInlcIjogMjcwLFxyXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCJcclxuICAgICAgICB9XHJcbiAgICBdLFxyXG4gICAgXCJoaW50c1wiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogLTMwNSxcclxuICAgICAgICAgICAgXCJ5XCI6IDEyMFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogMTk1LFxyXG4gICAgICAgICAgICBcInlcIjogLTVcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC0zMzAsXHJcbiAgICAgICAgICAgIFwieVwiOiAtMjA1XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFwieFwiOiAtMTA1LFxyXG4gICAgICAgICAgICBcInlcIjogNDVcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IDI5NSxcclxuICAgICAgICAgICAgXCJ5XCI6IC0yMDVcclxuICAgICAgICB9XHJcbiAgICBdLFxyXG4gICAgXCJzdGVwc1wiOiA1LFxyXG4gICAgXCJpbnRlcnNlY3Rpb25zXCI6IDksXHJcbiAgICBcImJ1dHRvbnNcIjogXCJSWlwiLFxyXG4gICAgXCJhcmVhc1wiOiBudWxsLFxyXG4gICAgXCJ3aW5kb3dzXCI6IHtcclxuICAgICAgXCJydVwiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXHJcbiAgICAgICAgICBcInRleHRcIjogXCLQltC40LfQvdGMIOKAlCDRjdGC0L4g0L/RgNC10LbQtNC1INCy0YHQtdCz0L4g0YXQsNC+0YEsINCyINC60L7RgtC+0YDQvtC8INGC0Ysg0LfQsNGC0LXRgNGP0L0uINCl0L7RgdC1INCe0YDRgtC10LPQsC3QuC3Qk9Cw0YHRgdC10YJcIlxyXG4gICAgICAgIH1cclxuICAgICAgXSxcclxuICAgICAgXCJlblwiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXHJcbiAgICAgICAgICBcInRleHRcIjogXCJMaWZlIC0gaXMgZmlyc3Qgb2YgYWxsIHRoZSBjaGFvcywgaW4gd2hpY2ggeW91IGxvc3QuIEpvc9C1IE9ydGVnYSB5IEdhc3NldFwiXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgfVxyXG4gIH0sXHJcbiAge1xyXG4gICAgXCJsYWJlbFwiOiBcIklNUEVESU1FTlRBXCIsXHJcbiAgICBcIm9iamVjdHNcIjogW1xyXG4gICAgICB7XHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcclxuICAgICAgICBcInhcIjogLTkwLFxyXG4gICAgICAgIFwieVwiOiAtNzBcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXHJcbiAgICAgICAgXCJ4XCI6IDkwLFxyXG4gICAgICAgIFwieVwiOiAtNzBcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIixcclxuICAgICAgICBcInhcIjogNTUsXHJcbiAgICAgICAgXCJ5XCI6IC0zMFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiLFxyXG4gICAgICAgIFwieFwiOiAtNTUsXHJcbiAgICAgICAgXCJ5XCI6IC0zMFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ0eXBlXCI6IFwiY3Jvc3NcIixcclxuICAgICAgICBcInhcIjogNTUsXHJcbiAgICAgICAgXCJ5XCI6IDMwXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxyXG4gICAgICAgIFwieFwiOiAtNTUsXHJcbiAgICAgICAgXCJ5XCI6IDMwXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInR5cGVcIjogXCJjcm9zc1wiLFxyXG4gICAgICAgIFwieFwiOiA5MCxcclxuICAgICAgICBcInlcIjogNzBcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwidHlwZVwiOiBcImNyb3NzXCIsXHJcbiAgICAgICAgXCJ4XCI6IC05MCxcclxuICAgICAgICBcInlcIjogNzBcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIixcclxuICAgICAgICBcInhcIjogLTE3NSxcclxuICAgICAgICBcInlcIjogNDBcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIFwidHlwZVwiOiBcInVuY3Jvc3NcIixcclxuICAgICAgICBcInhcIjogMTc1LFxyXG4gICAgICAgIFwieVwiOiA0MFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgXCJ0eXBlXCI6IFwidW5jcm9zc1wiLFxyXG4gICAgICAgIFwieFwiOiA1NSxcclxuICAgICAgICBcInlcIjogMjAwXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBcInR5cGVcIjogXCJ1bmNyb3NzXCIsXHJcbiAgICAgICAgXCJ4XCI6IC01NSxcclxuICAgICAgICBcInlcIjogMjAwXHJcbiAgICAgIH1cclxuICAgIF0sXHJcbiAgICBcImNsaWNrc1wiOiA1MCxcclxuICAgIFwiaGludHNcIjogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC0yMzAsXHJcbiAgICAgICAgICAgIFwieVwiOiAtODBcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IC0yMDUsXHJcbiAgICAgICAgICAgIFwieVwiOiA5NVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInhcIjogMjIwLFxyXG4gICAgICAgICAgICBcInlcIjogOTVcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgXCJ4XCI6IDI0NSxcclxuICAgICAgICAgICAgXCJ5XCI6IC04MFxyXG4gICAgICAgIH1cclxuICAgIF0sXHJcbiAgICBcInN0ZXBzXCI6IDQsXHJcbiAgICBcImludGVyc2VjdGlvbnNcIjogNixcclxuICAgIFwiYnV0dG9uc1wiOiBcIlIgWlwiLFxyXG5cclxuICAgIFwid2luZG93c1wiOiB7XHJcbiAgICAgIFwicnVcIjogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIFwibGFiZWxcIjogXCJMSU5FU1wiLFxyXG4gICAgICAgICAgXCJ0ZXh0XCI6IFwi0J3QtSDRgtGA0LDRgtGM0YLQtSDQstGA0LXQvNGPINCyINC/0L7QuNGB0LrQtSDQv9GA0LXQv9GP0YLRgdGC0LLQuNC5OiDQuNGFINC80L7QttC10YIg0Lgg0L3QtSDRgdGD0YnQtdGB0YLQstC+0LLQsNGC0YwuIOKAlCDQpNGA0LDQvdGGINCa0LDRhNC60LBcIlxyXG4gICAgICAgIH1cclxuICAgICAgXSxcclxuICAgICAgXCJlblwiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgXCJsYWJlbFwiOiBcIkxJTkVTXCIsXHJcbiAgICAgICAgICBcInRleHRcIjogXCJEbyBub3Qgd2FzdGUgeW91ciB0aW1lIHNlYXJjaGluZyBmb3Igb2JzdGFjbGVzOiB0aGV5IG1heSBkb2VzIG5vdCBleGlzdC4g4oCUIEZyYW56IEthZmthXCJcclxuICAgICAgICB9XHJcbiAgICAgIF1cclxuICAgIH1cclxuICB9XHJcbl0iLCJjbGFzcyBBamF4UmVxdWVzdHMge1xyXG5cdGNvbnN0cnVjdG9yKGdhbWUsIHJlcG9zaXRvcnkpIHtcclxuXHRcdHRoaXMuZ2FtZSA9IGdhbWU7XHJcblx0XHR0aGlzLnJlcG9zaXRvcnkgPSByZXBvc2l0b3J5O1xyXG5cclxuXHRcdHRoaXMudHJhbnNsYXRlcyA9IHtcclxuXHRcdFx0YXNrOiB7XHJcblx0XHRcdFx0cnU6IHtcclxuXHRcdFx0XHRcdGxhYmVsOiAnSU5GTycsXHJcblx0XHRcdFx0XHR0ZXh0OiAn0JfQsNCz0YDRg9C30LjRgtGMINC90L7QstGL0LUg0YPRgNC+0LLQvdC4PydcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGVuOiB7XHJcblx0XHRcdFx0XHRsYWJlbDogJ0lORk8nLFxyXG5cdFx0XHRcdFx0dGV4dDogJ0Rvd25sb2FkIG5ldyBsZXZlbHM/J1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdFx0bm9OZXdMZXZlbHM6IHtcclxuXHRcdFx0XHRydToge1xyXG5cdFx0XHRcdFx0bGFiZWw6ICdJTkZPJyxcclxuXHRcdFx0XHRcdHRleHQ6ICfQktGLINC/0YDQvtGI0LvQuCDQstGB0LUg0LPQvtC70L7QstC+0LvQvtC80LrQuCDQsiDQuNCz0YDQtS4g0J7QttC40LTQsNC50YLQtSDQvdC+0LLRi9GFINGD0YDQvtCy0L3QtdC5INC60LDQttC00YPRjiDQvdC10LTQtdC70Y4hJ1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0ZW46IHtcclxuXHRcdFx0XHRcdGxhYmVsOiAnSU5GTycsXHJcblx0XHRcdFx0XHR0ZXh0OiAnWW91IHBhc3NlZCBhbGwgdGhlIHB1enpsZXMgaW4gdGhlIGdhbWUuIEV4cGVjdCBuZXcgbGV2ZWxzIGV2ZXJ5IHdlZWshJ1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdFx0ZmFpbExvYWROZXdMZXZlbHM6IHtcclxuXHRcdFx0XHRydToge1xyXG5cdFx0XHRcdFx0bGFiZWw6ICdJTkZPJyxcclxuXHRcdFx0XHRcdHRleHQ6ICfQntGC0YHRg9GC0YHRgtCy0YPQtdGCINGB0L7QtdC00LjQvdC10L3QuNC1INGBINGB0LXRgNCy0LXRgNC+0LwuJ1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0ZW46IHtcclxuXHRcdFx0XHRcdGxhYmVsOiAnSU5GTycsXHJcblx0XHRcdFx0XHR0ZXh0OiAnTm8gY29ubmVjdGlvbiB0byB0aGUgc2VydmVyLidcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHR9XHJcblx0fVxyXG5cdHJlcXVlc3ROZXdMZXZlbHMoKSB7XHJcblx0XHR2YXIgdXJsID0gYCR7dGhpcy5yZXBvc2l0b3J5fS9sZXZlbHMke3RoaXMuZ2FtZS5wbGF5LmN1cnJlbnRMZXZlbCsxfS5qc29uYDtcclxuXHJcblx0XHR0aGlzLmdhbWUud2luZG93TWFuYWdlci5hZGRXaW5kb3codGhpcy50cmFuc2xhdGVzLmFza1t0aGlzLmdhbWUuc2V0dGluZ3MubGFuZ10sICgpID0+IHtcclxuXHRcdFx0JC5nZXRKU09OKHVybClcclxuXHRcdFx0XHQuZG9uZSgoZGF0YSkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5nYW1lLnBsYXkubGV2ZWxzID0gdGhpcy5nYW1lLnBsYXkubGV2ZWxzLmNvbmNhdChkYXRhKTtcclxuXHRcdFx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdsZXZlbHMnLCBKU09OLnN0cmluZ2lmeSh0aGlzLmdhbWUucGxheS5sZXZlbHMpKTtcclxuXHRcdFx0XHRcdHRoaXMuZ2FtZS5wbGF5LmxvYWRMZXZlbCh0aGlzLmdhbWUucGxheS5jdXJyZW50TGV2ZWwgKyAxKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHRcdC5mYWlsKChlcnIpID0+IHtcclxuXHRcdFx0XHRcdHZhciBjb25maWc7XHJcblxyXG5cdFx0XHRcdFx0aWYgKGVyci5zdGF0dXMgPT09IDQwNCkgY29uZmlnID0gdGhpcy50cmFuc2xhdGVzLm5vTmV3TGV2ZWxzW3RoaXMuZ2FtZS5zZXR0aW5ncy5sYW5nXTtcclxuXHRcdFx0XHRcdGVsc2UgY29uZmlnID0gdGhpcy50cmFuc2xhdGVzLmZhaWxMb2FkTmV3TGV2ZWxzW3RoaXMuZ2FtZS5zZXR0aW5ncy5sYW5nXTtcclxuXHJcblx0XHRcdFx0XHR0aGlzLmdhbWUud2luZG93TWFuYWdlci5hZGRXaW5kb3coY29uZmlnLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4gdGhpcy5nYW1lLm5hdmlnYXRpb24udG9NZW51KCksIDMwMCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBamF4UmVxdWVzdHM7IiwiY2xhc3MgTmF2aWdhdGlvbiB7XHJcblx0Y29uc3RydWN0b3IoZ2FtZSkge1xyXG5cdFx0dGhpcy5nYW1lID0gZ2FtZTtcclxuXHJcblx0XHR0aGlzLl9iaW5kRXZlbnRzKCk7XHJcblx0fVxyXG5cdF9iaW5kRXZlbnRzKCkge1xyXG5cdFx0Ly8gQ29yZG92YSBBUElcclxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3BhdXNlJywgdGhpcy5wYXVzZS5iaW5kKHRoaXMpLCBmYWxzZSk7XHJcblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdyZXN1bWUnLCB0aGlzLnJlc3VtZS5iaW5kKHRoaXMpLCBmYWxzZSk7XHJcblx0fVxyXG5cclxuXHR0b01lbnUoKSB7XHJcblx0XHR0aGlzLmdhbWUuc3BsYXNoLnNob3coKTtcclxuXHRcdHRoaXMuZ2FtZS5tZW51LnNjZW5lLnNob3coKTtcclxuXHRcdHRoaXMuZ2FtZS5pbnRlcmZhY2Uuc2NlbmUuaGlkZSgpO1xyXG5cdFx0dGhpcy5nYW1lLnBsYXkuc2NlbmUuaGlkZSgpO1xyXG5cdFx0dGhpcy5nYW1lLnNldHRpbmdzLnNjZW5lLmhpZGUoKTtcclxuXHR9XHJcblxyXG5cdHRvU2V0dGluZ3MoKSB7XHJcblx0XHR0aGlzLmdhbWUuc3BsYXNoLnNob3coKTtcclxuXHRcdHRoaXMuZ2FtZS5zZXR0aW5ncy5zY2VuZS5zaG93KCk7XHJcblx0XHR0aGlzLmdhbWUubWVudS5zY2VuZS5oaWRlKCk7XHJcblx0XHR0aGlzLmdhbWUuaW50ZXJmYWNlLnNjZW5lLmhpZGUoKTtcclxuXHRcdHRoaXMuZ2FtZS5wbGF5LnNjZW5lLmhpZGUoKTtcclxuXHR9XHJcblxyXG5cdHRvUGxheSgpIHtcclxuXHRcdHRoaXMuZ2FtZS5zcGxhc2guc2hvdygpO1xyXG5cdFx0dGhpcy5nYW1lLnBsYXkuc2NlbmUuc2hvdygpO1xyXG5cdFx0dGhpcy5nYW1lLmludGVyZmFjZS5zY2VuZS5zaG93KCk7XHJcblx0XHR0aGlzLmdhbWUuc2V0dGluZ3Muc2NlbmUuaGlkZSgpO1xyXG5cdFx0dGhpcy5nYW1lLm1lbnUuc2NlbmUuaGlkZSgpO1xyXG5cclxuXHRcdHRoaXMuZ2FtZS5wbGF5LmxvYWRMZXZlbCgrbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2N1cnJlbnRMZXZlbCcpKTtcclxuXHR9XHJcblxyXG5cdHBhdXNlKCkge1xyXG5cdFx0dGhpcy5nYW1lLm11c2ljLnN0b3AoKTtcclxuXHRcdHRoaXMuZ2FtZS5lZmZlY3QudG9nZ2xlKGZhbHNlKTtcclxuXHR9XHJcblxyXG5cdHJlc3VtZSgpIHtcclxuXHRcdHRoaXMuZ2FtZS5zZXR0aW5ncy5pc011c2ljICYmIHRoaXMuZ2FtZS5tdXNpYy5wbGF5KCk7XHJcblx0XHR0aGlzLmdhbWUuZWZmZWN0LnRvZ2dsZSh0cnVlKTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTmF2aWdhdGlvbjtcclxuIiwiY2xhc3MgV2luZG93TWFuYWdlciB7XHJcblx0Y29uc3RydWN0b3IoZ2FtZSkge1xyXG5cdFx0dGhpcy5nYW1lID0gZ2FtZTtcclxuXHJcblx0XHR0aGlzLmNsb3NpbmdTcGVlZCA9IDMwMDtcclxuXHRcdHRoaXMuaXNDbG9zaW5nID0gZmFsc2U7XHJcblxyXG5cdFx0dGhpcy53aW5kb3cgPSAkKCcjd2luZG93Jyk7XHJcblx0XHR0aGlzLmNvbnRlbnQgPSAkKCcjY29udGVudCcpO1xyXG5cdFx0dGhpcy5sYWJlbCA9IHRoaXMud2luZG93LmZpbmQoJ2gxJyk7XHJcblx0XHR0aGlzLnRleHQgPSB0aGlzLndpbmRvdy5maW5kKCdwJyk7XHJcblx0XHR0aGlzLmJ1dHRvbiA9IHRoaXMud2luZG93LmZpbmQoJ2J1dHRvbicpO1xyXG5cclxuXHRcdC8vIGNhbGxiYWNrXHJcblx0XHR0aGlzLm9uO1xyXG5cclxuXHRcdHRoaXMuX2JpbmRFdmVudHMoKTtcclxuXHRcdHRoaXMuY2xvc2UoKTtcclxuXHR9XHJcblx0X2JpbmRFdmVudHMoKSB7XHJcblx0XHR0aGlzLmJ1dHRvbi5vbignY2xpY2snLCAoKCkgPT4ge1xyXG5cdFx0XHR0aGlzLndpbmRvdy5mYWRlT3V0KCgpID0+IHRoaXMuY2xvc2UoKSk7XHJcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4gdGhpcy5vbiAmJiB0aGlzLm9uKCksIDEwMDApO1xyXG5cdFx0fSkpO1xyXG5cdH1cclxuXHRhZGRXaW5kb3coY29uZmlnLCBjYikge1xyXG5cdFx0dGhpcy5sYWJlbC5odG1sKGNvbmZpZy5sYWJlbCk7XHJcblx0XHR0aGlzLnRleHQuaHRtbChjb25maWcudGV4dCk7XHJcblx0XHR0aGlzLm9uID0gY2I7XHJcblxyXG5cdFx0dGhpcy5vcGVuKCk7XHJcblx0fVxyXG5cdG9wZW4oKSB7XHJcblx0XHR0aGlzLndpbmRvdy5zaG93KCk7XHJcblx0fVxyXG5cdGNsb3NlKCkge1xyXG5cdFx0dGhpcy53aW5kb3cuaGlkZSgpO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBXaW5kb3dNYW5hZ2VyO1xyXG4iLCJ2YXIgYWRzID0ge1xyXG5cdGluaXQ6IGZ1bmN0aW9uKGdhbWUpIHtcclxuXHRcdGFkcy5nYW1lID0gZ2FtZTtcclxuXHRcdGFkcy5pc0xvYWQgPSBmYWxzZTtcclxuXHRcdGlmKCF3aW5kb3cuQ29jb29uIHx8IGdhbWUuZWRpdGlvbiA9PT0gJ1BBSUQnKSByZXR1cm47XHJcblxyXG5cdFx0YWRzLmludGVyc3RpdGlhbCA9IENvY29vbi5BZC5BZE1vYi5jcmVhdGVJbnRlcnN0aXRpYWwoXCJhZCBtb2Iga2V5XCIpO1xyXG5cclxuXHRcdGFkcy5pbnRlcnN0aXRpYWwub24oXCJsb2FkXCIsIGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRhZHMuaXNMb2FkID0gdHJ1ZTtcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0bG9hZCgpIHtcclxuXHRcdGlmKHdpbmRvdy5Db2Nvb24gJiYgYWRzLmdhbWUuZWRpdGlvbiA9PT0gJ0ZSRUUnKSB7XHJcblx0XHRcdGFkcy5pbnRlcnN0aXRpYWwubG9hZCgpO1xyXG5cdFx0XHRhZHMuaXNMb2FkID0gZmFsc2U7XHJcblx0XHR9XHJcblx0fSxcclxuXHRzaG93KCkge1xyXG5cdFx0aWYod2luZG93LkNvY29vbiAmJiBhZHMuZ2FtZS5lZGl0aW9uID09PSAnRlJFRScpIHtcclxuXHRcdFx0YWRzLmludGVyc3RpdGlhbC5zaG93KCk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGFkcztcclxuIiwidmFyIGhlbHBlciA9IHtcclxuXHRnZXRIZWlnaHRUcmlhbmdsZSh4LCB5LCB4MiwgeTIsIHgzLCB5Mykge1xyXG5cdFx0Ly/QtNC70LjQvdGLINGB0YLQvtGA0L7QvSDRgtGA0LXRg9Cz0L7Qu9GM0L3QuNC60LBcclxuXHRcdHZhciBBQyA9IGhlbHBlci5nZXREaXN0YW5jZSh4LCB5LCB4MywgeTMpO1xyXG5cdFx0dmFyIEJDID0gaGVscGVyLmdldERpc3RhbmNlKHgyLCB5MiwgeDMsIHkzKTtcclxuXHRcdHZhciBBQiA9IGhlbHBlci5nZXREaXN0YW5jZSh4LCB5LCB4MiwgeTIpO1xyXG5cclxuXHRcdC8v0L/QvtC70YPQv9C10YDQuNC80LXRgtGAXHJcblx0XHR2YXIgcCA9IChBQytCQytBQikvMjtcclxuXHJcblx0XHQvL9Ck0L7RgNC80YPQu9CwINC00LvQuNC90Ysg0LLRi9GB0L7RgtGLINGBINC/0L7QvNC+0YnRjNGOINGB0YLQvtGA0L7QvSDRgtGA0LXRg9Cz0L7Qu9GM0L3QuNC60LBcclxuXHRcdHZhciBoID0gKDIvQUIpKk1hdGguc3FydChwKihwLUFCKSoocC1BQykqKHAtQkMpKTtcclxuXHJcblx0XHRyZXR1cm4gaDtcclxuXHR9LFxyXG5cdGdldERpc3RhbmNlKHgsIHksIHgyLCB5Mikge1xyXG5cdFx0Ly/QtNC70LjQvdGLINGB0YLQvtGA0L7QvSDRgtGA0LXRg9Cz0L7Qu9GM0L3QuNC60LBcclxuXHRcdHJldHVybiBNYXRoLnNxcnQoTWF0aC5wb3coeDIteCwgMikgKyBNYXRoLnBvdyh5Mi15LCAyKSk7XHJcblx0fSxcclxuXHRnZXRsb25n0KFvb3Jkc0xpbmUoeCwgeSwgeDIsIHkyLCBuKSB7XHJcblx0XHR2YXIgbG9uZ1ggPSB4MiAtIHg7XHJcblx0XHR2YXIgbG9uZ1kgPSB5MiAtIHk7XHJcblxyXG5cdFx0cmV0dXJuIHt4OiB4Mitsb25nWCpuLCB5OiB5Mitsb25nWSpufTtcclxuXHR9LFxyXG5cdGlzQ29udGFpbnMocngsIHJ5LCBydywgcmgsIHgsIHkpIHtcclxuXHRcdHJldHVybiB4ID49IHJ4ICYmIHggPD0gcngrcncgJiYgeSA+PSByeSAmJiB5IDw9IHJ5K3JoO1xyXG5cdH0sXHJcblx0aW50UmFuZFJhbmdlKG1pbiwgbWF4KSB7XHJcblx0ICBcdHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xyXG5cdH0sXHJcblx0ZmxvYXRSYW5kUmFuZ2UobWluLCBtYXgpIHtcclxuXHQgIFx0cmV0dXJuICsoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluKS50b0ZpeGVkKDEpO1xyXG5cdH0sXHJcblx0aW5SYW5nZUFycmF5KHZhbHVlLCBhcnIpIHtcclxuXHRcdGlmKHZhbHVlID4gYXJyLmxlbmd0aC0xKSByZXR1cm4gMDtcclxuXHRcdGVsc2UgaWYodmFsdWUgPCAwKSByZXR1cm4gYXJyLmxlbmd0aC0xO1xyXG5cdFx0ZWxzZSByZXR1cm4gdmFsdWU7XHJcblx0fSxcclxuXHRtb2JpbGVBbmRUYWJsZXRjaGVjaygpIHtcclxuXHQgIHZhciBjaGVjayA9IGZhbHNlO1xyXG5cdCAgKGZ1bmN0aW9uKGEpe2lmKC8oYW5kcm9pZHxiYlxcZCt8bWVlZ28pLittb2JpbGV8YXZhbnRnb3xiYWRhXFwvfGJsYWNrYmVycnl8YmxhemVyfGNvbXBhbHxlbGFpbmV8ZmVubmVjfGhpcHRvcHxpZW1vYmlsZXxpcChob25lfG9kKXxpcmlzfGtpbmRsZXxsZ2UgfG1hZW1vfG1pZHB8bW1wfG1vYmlsZS4rZmlyZWZveHxuZXRmcm9udHxvcGVyYSBtKG9ifGluKWl8cGFsbSggb3MpP3xwaG9uZXxwKGl4aXxyZSlcXC98cGx1Y2tlcnxwb2NrZXR8cHNwfHNlcmllcyg0fDYpMHxzeW1iaWFufHRyZW98dXBcXC4oYnJvd3NlcnxsaW5rKXx2b2RhZm9uZXx3YXB8d2luZG93cyBjZXx4ZGF8eGlpbm98YW5kcm9pZHxpcGFkfHBsYXlib29rfHNpbGsvaS50ZXN0KGEpfHwvMTIwN3w2MzEwfDY1OTB8M2dzb3w0dGhwfDUwWzEtNl1pfDc3MHN8ODAyc3xhIHdhfGFiYWN8YWMoZXJ8b298c1xcLSl8YWkoa298cm4pfGFsKGF2fGNhfGNvKXxhbW9pfGFuKGV4fG55fHl3KXxhcHR1fGFyKGNofGdvKXxhcyh0ZXx1cyl8YXR0d3xhdShkaXxcXC1tfHIgfHMgKXxhdmFufGJlKGNrfGxsfG5xKXxiaShsYnxyZCl8YmwoYWN8YXopfGJyKGV8dil3fGJ1bWJ8YndcXC0obnx1KXxjNTVcXC98Y2FwaXxjY3dhfGNkbVxcLXxjZWxsfGNodG18Y2xkY3xjbWRcXC18Y28obXB8bmQpfGNyYXd8ZGEoaXR8bGx8bmcpfGRidGV8ZGNcXC1zfGRldml8ZGljYXxkbW9ifGRvKGN8cClvfGRzKDEyfFxcLWQpfGVsKDQ5fGFpKXxlbShsMnx1bCl8ZXIoaWN8azApfGVzbDh8ZXooWzQtN10wfG9zfHdhfHplKXxmZXRjfGZseShcXC18Xyl8ZzEgdXxnNTYwfGdlbmV8Z2ZcXC01fGdcXC1tb3xnbyhcXC53fG9kKXxncihhZHx1bil8aGFpZXxoY2l0fGhkXFwtKG18cHx0KXxoZWlcXC18aGkocHR8dGEpfGhwKCBpfGlwKXxoc1xcLWN8aHQoYyhcXC18IHxffGF8Z3xwfHN8dCl8dHApfGh1KGF3fHRjKXxpXFwtKDIwfGdvfG1hKXxpMjMwfGlhYyggfFxcLXxcXC8pfGlicm98aWRlYXxpZzAxfGlrb218aW0xa3xpbm5vfGlwYXF8aXJpc3xqYSh0fHYpYXxqYnJvfGplbXV8amlnc3xrZGRpfGtlaml8a2d0KCB8XFwvKXxrbG9ufGtwdCB8a3djXFwtfGt5byhjfGspfGxlKG5vfHhpKXxsZyggZ3xcXC8oa3xsfHUpfDUwfDU0fFxcLVthLXddKXxsaWJ3fGx5bnh8bTFcXC13fG0zZ2F8bTUwXFwvfG1hKHRlfHVpfHhvKXxtYygwMXwyMXxjYSl8bVxcLWNyfG1lKHJjfHJpKXxtaShvOHxvYXx0cyl8bW1lZnxtbygwMXwwMnxiaXxkZXxkb3x0KFxcLXwgfG98dil8enopfG10KDUwfHAxfHYgKXxtd2JwfG15d2F8bjEwWzAtMl18bjIwWzItM118bjMwKDB8Mil8bjUwKDB8Mnw1KXxuNygwKDB8MSl8MTApfG5lKChjfG0pXFwtfG9ufHRmfHdmfHdnfHd0KXxub2soNnxpKXxuenBofG8yaW18b3AodGl8d3YpfG9yYW58b3dnMXxwODAwfHBhbihhfGR8dCl8cGR4Z3xwZygxM3xcXC0oWzEtOF18YykpfHBoaWx8cGlyZXxwbChheXx1Yyl8cG5cXC0yfHBvKGNrfHJ0fHNlKXxwcm94fHBzaW98cHRcXC1nfHFhXFwtYXxxYygwN3wxMnwyMXwzMnw2MHxcXC1bMi03XXxpXFwtKXxxdGVrfHIzODB8cjYwMHxyYWtzfHJpbTl8cm8odmV8em8pfHM1NVxcL3xzYShnZXxtYXxtbXxtc3xueXx2YSl8c2MoMDF8aFxcLXxvb3xwXFwtKXxzZGtcXC98c2UoYyhcXC18MHwxKXw0N3xtY3xuZHxyaSl8c2doXFwtfHNoYXJ8c2llKFxcLXxtKXxza1xcLTB8c2woNDV8aWQpfHNtKGFsfGFyfGIzfGl0fHQ1KXxzbyhmdHxueSl8c3AoMDF8aFxcLXx2XFwtfHYgKXxzeSgwMXxtYil8dDIoMTh8NTApfHQ2KDAwfDEwfDE4KXx0YShndHxsayl8dGNsXFwtfHRkZ1xcLXx0ZWwoaXxtKXx0aW1cXC18dFxcLW1vfHRvKHBsfHNoKXx0cyg3MHxtXFwtfG0zfG01KXx0eFxcLTl8dXAoXFwuYnxnMXxzaSl8dXRzdHx2NDAwfHY3NTB8dmVyaXx2aShyZ3x0ZSl8dmsoNDB8NVswLTNdfFxcLXYpfHZtNDB8dm9kYXx2dWxjfHZ4KDUyfDUzfDYwfDYxfDcwfDgwfDgxfDgzfDg1fDk4KXx3M2MoXFwtfCApfHdlYmN8d2hpdHx3aShnIHxuY3xudyl8d21sYnx3b251fHg3MDB8eWFzXFwtfHlvdXJ8emV0b3x6dGVcXC0vaS50ZXN0KGEuc3Vic3RyKDAsNCkpKSBjaGVjayA9IHRydWU7fSkobmF2aWdhdG9yLnVzZXJBZ2VudHx8bmF2aWdhdG9yLnZlbmRvcnx8d2luZG93Lm9wZXJhKTtcclxuXHQgIHJldHVybiBjaGVjaztcclxuXHR9XHJcbn07XHJcblxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gaGVscGVyO1xyXG4iLCJjb25zdCBzZXJ2aWNlcyA9IHJlcXVpcmUoJy4uL3NlcnZpY2VzLmpzb24nKTtcclxuXHJcbnZhciBub3RpZmljYXRpb25zID0gKGdhbWUpID0+IHtcclxuXHRpZighd2luZG93LnBsdWdpbnMgfHwgIXdpbmRvdy5wbHVnaW5zLk9uZVNpZ25hbCkgcmV0dXJuO1xyXG5cclxuXHR3aW5kb3cucGx1Z2lucy5PbmVTaWduYWxcclxuXHRcdC5zdGFydEluaXQoc2VydmljZXMuT25lU2lnbmFsSWQsIHNlcnZpY2VzLkdvb2dsZVBsYXlJZClcclxuXHRcdC5zZW5kVGFnKCdlZGl0aW9uJywgZ2FtZS5lZGl0aW9uKVxyXG5cdFx0LnNlbmRUYWcoJ3ZlcnNpb24nLCAndjIuMicpXHJcblx0XHQuZW5kSW5pdCgpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IG5vdGlmaWNhdGlvbnM7XHJcbiIsImNvbnN0IGhlbHBlciA9IHJlcXVpcmUoJy4uL21peGlucy9oZWxwZXInKTtcclxuXHJcbmNsYXNzIENhbnZhc0VmZmVjdCB7XHJcblx0Y29uc3RydWN0b3IoZ2FtZSwgY29uZmlnKSB7XHJcblx0XHR0aGlzLmdhbWUgPSBnYW1lO1xyXG5cclxuXHRcdHRoaXMuc2NlbmUgPSAkKCcjZWZmZWN0Jyk7XHJcblx0XHR0aGlzLnNjZW5lWzBdLndpZHRoID0gdGhpcy5nYW1lLnc7XHJcblx0XHR0aGlzLnNjZW5lWzBdLmhlaWdodCA9IHRoaXMuZ2FtZS5oO1xyXG5cclxuXHRcdHRoaXMuY3R4ID0gdGhpcy5zY2VuZVswXS5nZXRDb250ZXh0KCcyZCcpO1xyXG5cdFx0dGhpcy5pc1JlbmRlckdyYXBoeSA9IHRydWU7XHJcblxyXG5cdFx0dGhpcy5wYXJ0aWNsZXMgPSBbXTtcclxuXHJcblx0XHR0aGlzLmltYWdlID0gbmV3IEltYWdlKCk7XHJcblx0XHR0aGlzLmltYWdlLm9ubG9hZCA9ICgpID0+IHtcclxuXHRcdFx0dGhpcy5jcmVhdGVQYXJ0aWNsZXMoY29uZmlnLnBhcnRpY2xlcywgY29uZmlnLmNvbmZpZyk7XHJcblx0XHRcdHRoaXMubG9vcCgpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5pbWFnZS5zcmMgPSBjb25maWcuaW1hZ2U7XHJcblx0fVxyXG5cdHRvZ2dsZShib29sKSB7XHJcblx0XHR0aGlzLmlzUmVuZGVyR3JhcGh5ID0gYm9vbDtcclxuXHRcdGJvb2wgPyB0aGlzLnNjZW5lLnNob3coKSA6IHRoaXMuc2NlbmUuaGlkZSgpO1xyXG5cdFx0Ym9vbCAmJiB0aGlzLmxvb3AoKTtcclxuXHR9XHJcblx0cmVzaXplKCkge1xyXG5cdFx0dGhpcy5zY2VuZVswXS53aWR0aCA9IHRoaXMuZ2FtZS53O1xyXG5cdFx0dGhpcy5zY2VuZVswXS5oZWlnaHQgPSB0aGlzLmdhbWUuaDtcdFx0XHJcblx0fVxyXG5cclxuXHRsb29wKCkge1xyXG5cdFx0aWYoIXRoaXMuaXNSZW5kZXJHcmFwaHkpIHJldHVybjtcclxuXHJcblx0XHR0aGlzLnVwZGF0ZSgpO1xyXG5cdFx0dGhpcy5kcmF3KCk7XHJcblxyXG5cdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMubG9vcC5iaW5kKHRoaXMpKTtcclxuXHR9XHJcblx0dXBkYXRlKCkge1xyXG5cdFx0Zm9yKGxldCBwIG9mIHRoaXMucGFydGljbGVzKSB7XHJcblx0XHRcdHAudXBkYXRlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRkcmF3KCkge1xyXG5cdFx0dGhpcy5jbGVhclNjcmVlbigpO1xyXG5cclxuXHRcdGZvcihsZXQgcCBvZiB0aGlzLnBhcnRpY2xlcykge1xyXG5cdFx0XHRwLmRyYXcoKTtcclxuXHRcdH1cclxuXHR9XHJcblx0Y2xlYXJTY3JlZW4oKSB7XHJcblx0XHR0aGlzLmN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5nYW1lLncsIHRoaXMuZ2FtZS5oKTtcclxuXHR9XHJcblxyXG5cdGNyZWF0ZVBhcnRpY2xlcyhjb3VudCwgY29uZmlnKSB7XHJcblx0XHRmb3IobGV0IGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xyXG5cdFx0XHR0aGlzLnBhcnRpY2xlcy5wdXNoKG5ldyBQYXJ0aWNsZSh0aGlzLCB7XHJcblx0XHRcdFx0cjogICAgIGhlbHBlci5pbnRSYW5kUmFuZ2UoY29uZmlnLnJbMF0sIGNvbmZpZy5yWzFdKSxcclxuXHRcdFx0XHR4OiAgICAgaGVscGVyLmludFJhbmRSYW5nZShjb25maWcueFswXSwgY29uZmlnLnhbMV0pLFxyXG5cdFx0XHRcdHk6ICAgICBoZWxwZXIuaW50UmFuZFJhbmdlKGNvbmZpZy55WzBdLCBjb25maWcueVsxXSksXHJcblx0XHRcdFx0dmVjWDogIGhlbHBlci5pbnRSYW5kUmFuZ2UoY29uZmlnLnZlY1hbMF0sIGNvbmZpZy52ZWNZWzFdKSxcclxuXHRcdFx0XHR2ZWNZOiAgaGVscGVyLmludFJhbmRSYW5nZShjb25maWcudmVjWVswXSwgY29uZmlnLnZlY1lbMV0pLFxyXG5cdFx0XHRcdGFscGhhOiBoZWxwZXIuZmxvYXRSYW5kUmFuZ2UoY29uZmlnLmFscGhhWzBdLCBjb25maWcuYWxwaGFbMV0pXHJcblx0XHRcdH0pKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIFBhcnRpY2xlIHtcclxuXHRjb25zdHJ1Y3RvcihlZmZlY3QsIHByb3ApIHtcclxuXHRcdHRoaXMuZWZmZWN0ID0gZWZmZWN0O1xyXG5cdFx0dGhpcy5nYW1lID0gdGhpcy5lZmZlY3QuZ2FtZTtcclxuXHJcblx0XHR0aGlzLnIgPSBwcm9wLnIgfHwgMTA7XHJcblx0XHR0aGlzLnggPSBwcm9wLnggfHwgMDtcclxuXHRcdHRoaXMueSA9IHByb3AueSB8fCAwO1xyXG5cdFx0dGhpcy52ZWNYID0gcHJvcC52ZWNYIHx8IDE7XHJcblx0XHR0aGlzLnZlY1kgPSBwcm9wLnZlY1kgfHwgMTtcclxuXHRcdHRoaXMuYWxwaGEgPSBwcm9wLmFscGhhIHx8IDE7XHJcblx0fVxyXG5cclxuXHR1cGRhdGUoKSB7XHJcblx0XHRpZih0aGlzLnggKyB0aGlzLnIgPCAwKSB7XHJcblx0XHRcdHRoaXMueCA9IHRoaXMuZ2FtZS53K3RoaXMucjtcclxuXHRcdFx0dGhpcy52ZWNZID0gaGVscGVyLmludFJhbmRSYW5nZSgtdGhpcy52ZWNZLCB0aGlzLnZlY1kpO1xyXG5cclxuXHRcdH0gZWxzZSBpZih0aGlzLnggLSB0aGlzLnIgPiB0aGlzLmdhbWUudykge1xyXG5cdFx0XHR0aGlzLnggPSAtdGhpcy5yO1xyXG5cdFx0XHR0aGlzLnZlY1kgPSBoZWxwZXIuaW50UmFuZFJhbmdlKC10aGlzLnZlY1ksIHRoaXMudmVjWSk7XHJcblxyXG5cdFx0fSBpZih0aGlzLnkgKyB0aGlzLnIgPCAwKSB7XHJcblx0XHRcdHRoaXMueSA9IHRoaXMuZ2FtZS5oK3RoaXMucjtcclxuXHRcdFx0dGhpcy52ZWNYID0gaGVscGVyLmludFJhbmRSYW5nZSgtdGhpcy52ZWNYLCB0aGlzLnZlY1gpO1xyXG5cclxuXHRcdH0gZWxzZSBpZih0aGlzLnkgLSB0aGlzLnIgPiB0aGlzLmdhbWUuaCkge1xyXG5cdFx0XHR0aGlzLnkgPSAtdGhpcy5yO1xyXG5cdFx0XHR0aGlzLnZlY1ggPSBoZWxwZXIuaW50UmFuZFJhbmdlKC10aGlzLnZlY1gsIHRoaXMudmVjWCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy54ICs9IHRoaXMudmVjWDtcclxuXHRcdHRoaXMueSArPSB0aGlzLnZlY1k7XHJcblx0fVxyXG5cdGRyYXcoKSB7XHJcblx0XHR0aGlzLmVmZmVjdC5jdHguZ2xvYmFsQWxwaGEgPSB0aGlzLmFscGhhO1xyXG5cdFx0dGhpcy5lZmZlY3QuY3R4LmRyYXdJbWFnZShcclxuXHRcdFx0dGhpcy5lZmZlY3QuaW1hZ2UsXHJcblx0XHRcdHRoaXMueC10aGlzLnIsXHJcblx0XHRcdHRoaXMueS10aGlzLnIsIFxyXG5cdFx0XHR0aGlzLnIqMiwgXHJcblx0XHRcdHRoaXMucioyXHJcblx0XHQpO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDYW52YXNFZmZlY3Q7IiwidmFyIGhlbHBlciA9IHJlcXVpcmUoJy4uL21peGlucy9oZWxwZXInKTtcclxuXHJcbmNsYXNzIEludGVyZmFjZSB7XHJcblx0Y29uc3RydWN0b3IoZ2FtZSkge1xyXG5cdFx0dGhpcy5nYW1lID0gZ2FtZTtcclxuXHJcblx0XHR0aGlzLnNjZW5lID0gJCgnI2ludGVyZmFjZScpO1xyXG5cclxuXHRcdHRoaXMubGFiZWwgPSAkKCcjbGFiZWwnKTtcclxuXHRcdHRoaXMuc3RlcHMgPSAkKCcjc3RlcHMnKTtcclxuXHRcdHRoaXMuaW50ZXJzZWN0aW9ucyA9ICQoJyNpbnRlcnNlY3Rpb25zJyk7XHJcblx0XHRcclxuXHRcdHRoaXMucmVzdGFydCA9ICQoJyNyZXN0YXJ0Jyk7XHJcblx0XHR0aGlzLmhpbnQgPSAkKCcjaGludCcpO1xyXG5cdFx0dGhpcy5jbG9zZVBhdGggPSAkKCcjY2xvc2VQYXRoJyk7XHJcblxyXG5cdFx0dGhpcy5fYmluZEV2ZW50cygpO1xyXG5cdH1cclxuXHJcblx0X2JpbmRFdmVudHMoKSB7XHJcblx0XHR0aGlzLnJlc3RhcnQub24oJ2NsaWNrJywgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLmdhbWUucmVzdGFydENsaWNrcysrO1xyXG5cdFx0XHRpZih0aGlzLmdhbWUucmVzdGFydENsaWNrcyA+IDIwKSB7XHJcblx0XHRcdFx0dGhpcy5nYW1lLmFkcy5zaG93KCk7XHJcblx0XHRcdFx0dGhpcy5nYW1lLnJlc3RhcnRDbGlja3MgPSAwO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0aGlzLmdhbWUucGxheS5yZXN0YXJ0TGV2ZWwoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuY2xvc2VQYXRoLm9uKCdjbGljaycsICgpID0+IHtcclxuXHRcdFx0dGhpcy5nYW1lLnBsYXkubGV2ZWwuY2xvc2VQYXRoKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmhpbnQub24oJ2NsaWNrJywgKCkgPT4ge1xyXG5cdFx0XHRpZihNYXRoLnJvdW5kKHRoaXMuZ2FtZS5wbGF5LmxldmVsLmNsaWNrcy90aGlzLmdhbWUucGxheS5sZXZlbC5jb25maWcuY2xpY2tzKSA+IHRoaXMuZ2FtZS5wbGF5LmxldmVsLmN1cnJlbnRIaW50KSB7XHJcblx0XHRcdFx0dGhpcy5nYW1lLmFkcy5zaG93KCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRoaXMuZ2FtZS5wbGF5LmxldmVsLnNob3dIaW50KCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHNlbGVjdEJ1dHRvbnMoY29uZmlnKSB7XHJcblx0XHRmb3IobGV0IGtleSBpbiBjb25maWcpXHJcblx0XHRcdHRoaXNba2V5XSAmJiBjb25maWdba2V5XSA/IHRoaXNba2V5XS5zaG93KCkgOiB0aGlzW2tleV0uaGlkZSgpO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlR2FtZUluZm8oKSB7XHJcblx0XHR0aGlzLmludGVyc2VjdGlvbnMuaHRtbCgnSU5URVJTRUNUSU9OUyAnICsgdGhpcy5nYW1lLnBsYXkubGV2ZWwuaW50ZXJzZWN0aW9uc0xlZnQpO1xyXG5cdFx0dGhpcy5zdGVwcy5odG1sKCdTVEVQUyAnICsgdGhpcy5nYW1lLnBsYXkubGV2ZWwuc3RlcHNMZWZ0KTtcclxuXHRcdHRoaXMubGFiZWwuaHRtbCh0aGlzLmdhbWUucGxheS5sZXZlbC5sYWJlbCk7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEludGVyZmFjZTsiLCJjbGFzcyBNZW51IHtcclxuXHRjb25zdHJ1Y3RvcihnYW1lKSB7XHJcblx0XHR0aGlzLmdhbWUgPSBnYW1lO1xyXG5cclxuXHRcdHRoaXMuc2NlbmUgPSAkKCcjbWVudScpO1xyXG5cclxuXHRcdHRoaXMuc3RhcnQgPSAkKCcuc3RhcnQnKTtcclxuXHRcdHRoaXMuc2V0dXAgPSAkKCcuc2V0dXAnKTtcclxuXHRcdHRoaXMuZXhpdCA9ICQoJy5leGl0Jyk7XHJcblx0XHR0aGlzLnR1dG9yaWFsID0gJCgnLnR1dG9yaWFsJyk7XHJcblxyXG5cdFx0dGhpcy5fYmluZEV2ZW50cygpO1xyXG5cdFx0dGhpcy5fY3JlYXRlV2luZG93cygpO1xyXG5cdH1cclxuXHRfYmluZEV2ZW50cygpIHtcclxuXHRcdHRoaXMuc3RhcnQub24oJ2NsaWNrJywgKCkgPT4gdGhpcy5nYW1lLm5hdmlnYXRpb24udG9QbGF5KCkpO1xyXG5cdFx0dGhpcy5zZXR1cC5vbignY2xpY2snLCAoKSA9PiB0aGlzLmdhbWUubmF2aWdhdGlvbi50b1NldHRpbmdzKCkpO1xyXG5cdFx0dGhpcy5leGl0Lm9uKCdjbGljaycsICgpID0+IHRoaXMuZ2FtZS5uYXZpZ2F0aW9uLnRvTWVudSgpKTtcclxuXHRcdHRoaXMudHV0b3JpYWwub24oJ2NsaWNrJywgKCkgPT4gdGhpcy5zaG93VHV0b3JpYWwoKSk7XHJcblx0fVxyXG5cdF9jcmVhdGVXaW5kb3dzKCkge1xyXG5cdFx0aWYoIWxvY2FsU3RvcmFnZS5nZXRJdGVtKCdpc1Nob3dJbmZvJykpIHtcclxuXHRcdFx0dGhpcy5nYW1lLndpbmRvd01hbmFnZXIuYWRkV2luZG93KHtcclxuXHRcdFx0XHRcImxhYmVsXCI6IFwiSU5GT1wiLFxyXG5cdFx0XHRcdFwidGV4dFwiOiBgXHJcblx0XHRcdFx0XHRUbyBTZXR0aW5ncywgcHJlc3MgUyA8YnI+XHJcblx0XHRcdFx0XHRTaG93IFR1dG9yaWFsLCBwcmVzcyBUXHJcblx0XHRcdFx0YFxyXG5cdFx0XHR9LCAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5zaG93VHV0b3JpYWwoKTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdpc1Nob3dJbmZvJywgMSk7XHJcblx0XHR9XHJcblx0fVxyXG5cdHNob3dUdXRvcmlhbCgpIHtcclxuXHRcdGlmKHRoaXMuZ2FtZS5zZXR0aW5ncy5sYW5nID09ICdydScpIHtcclxuXHRcdFx0dGhpcy5nYW1lLndpbmRvd01hbmFnZXIuYWRkV2luZG93KHtcclxuXHRcdFx0XHRsYWJlbDogXCJUVVRPUklBTCBJXCIsXHJcblx0XHRcdFx0dGV4dDogXCLQlNC70Y8g0L/RgNC+0YXQvtC20LTQtdC90LjRjyDQs9C+0LvQvtCy0L7Qu9C+0LzQutC4INC90LXQvtCx0YXQvtC00LjQvNC+INC/0LXRgNC10YHQtdC60LDRgtGMINC40LPRgNC+0LLRi9C1INGC0L7Rh9C60Lgg0LvQuNC90LjRj9C80LgsINC60L7RgtC+0YDRi9C1INCy0Ysg0YDQsNGB0YHRgtCw0LLQu9GP0LXRgtC1INC90LDQttCw0YLQuNGP0LzQuCDQv9C+INGN0LrRgNCw0L3Rgywg0L7QtNC90LDQutC+INC30LDQv9C+0LzQvdC40YLQtSwg0YfRgtC+INC70LjQvdC40Lgg0Y/QstC70Y/RjtGC0YHRjyDQsdC10YHQutC+0L3QtdGH0L3Ri9C80LgsINC90L4g0JLRiyDQstC40LTQuNGC0LUg0YLQvtC70YzQutC+INC+0YLRgNC10LfQutC4INGN0YLQuNGFINC70LjQvdC40LkhXCJcclxuXHRcdFx0fSwgKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuZ2FtZS53aW5kb3dNYW5hZ2VyLmFkZFdpbmRvdyh7XHJcblx0XHRcdFx0XHRsYWJlbDogXCJUVVRPUklBTCBJSVwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCLQkiDQuNCz0YDQtSDRgtCw0Log0LbQtSDQv9GA0LjRgdGD0YLRgdGC0LLRg9GO0YIg0YDQsNC30LvQuNGH0L3Ri9C5INC60L7QvNCx0LjQvdCw0YbQuNC4INC+0LHRitC10LrRgtC+0LIuINCd0LDQv9GA0LjQvNC10YAg0LXRgdGC0Ywg0YLQvtGH0LrQuCwg0LrQvtGC0L7RgNGL0LUg0L3QtdC70YzQt9GPINC/0LXRgNC10YHQtdC60LDRgtGMINC4INGC0LDQuiDQtNCw0LvQtdC1LCDRgSDRjdGC0LjQvCDQktCw0Lwg0L3QtdC+0LHRhdC+0LTQuNC80L4g0YDQsNC30L7QsdGA0LDRgtGM0YHRjyDQuCDRgNC10YjQsNGC0Ywg0LPQvtC70L7QstC+0LvQvtC80LrQuCDRgdCw0LzQuNC8IVwiXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5nYW1lLndpbmRvd01hbmFnZXIuYWRkV2luZG93KHtcclxuXHRcdFx0XHRsYWJlbDogXCJUVVRPUklBTCBJXCIsXHJcblx0XHRcdFx0dGV4dDogXCJUbyBjb21wbGV0ZSB0aGUgcHV6emxlLCB5b3UgbmVlZCB0byBjcm9zcyB0aGUgZ2FtZSBwb2ludHMgd2l0aCBsaW5lcyB0aGF0IHlvdSBwbGFjZSB3aXRoIHRoZSBwcmVzc2VzIG9uIHRoZSBzY3JlZW4sIGJ1dCByZW1lbWJlciB0aGF0IHRoZSBsaW5lcyBhcmUgZW5kbGVzcywgYnV0IHlvdSBzZWUgb25seSB0aGUgc2VnbWVudHMgb2YgdGhlc2UgbGluZXMhXCJcclxuXHRcdFx0fSwgKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuZ2FtZS53aW5kb3dNYW5hZ2VyLmFkZFdpbmRvdyh7XHJcblx0XHRcdFx0XHRsYWJlbDogXCJUVVRPUklBTCBJSVwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJJbiB0aGUgZ2FtZSB0aGVyZSBhcmUgYWxzbyBkaWZmZXJlbnQgY29tYmluYXRpb25zIG9mIG9iamVjdHMuIEZvciBleGFtcGxlLCB0aGVyZSBhcmUgcG9pbnRzIHRoYXQgY2FuIG5vdCBiZSBjcm9zc2VkLCBhbmQgc28gb24sIHdpdGggdGhpcyB5b3UgbmVlZCB0byB1bmRlcnN0YW5kIGFuZCBzb2x2ZSB0aGUgcHV6emxlcyB0aGVtc2VsdmVzIVwiXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNZW51O1xyXG4iLCJjb25zdCBMZXZlbCA9IHJlcXVpcmUoJy4uL2xldmVsL0xldmVsJyk7XHJcbmNvbnN0IGhlbHBlciA9IHJlcXVpcmUoJy4uL21peGlucy9oZWxwZXInKTtcclxuXHJcbmNsYXNzIFBsYXkge1xyXG5cdGNvbnN0cnVjdG9yKGdhbWUpIHtcclxuXHRcdHRoaXMuZ2FtZSA9IGdhbWU7XHJcblxyXG5cdFx0dGhpcy5zY2VuZSA9ICQoJyNnYW1lJyk7XHJcblx0XHR0aGlzLnBhcGVyID0gU25hcCgnc3ZnJyk7XHJcblx0XHR0aGlzLnBhcGVyLmF0dHIoe1xyXG5cdFx0XHR3aWR0aDogdGhpcy5nYW1lLncsXHJcblx0XHRcdGhlaWdodDogdGhpcy5nYW1lLmhcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuY3VycmVudExldmVsID0gK2xvY2FsU3RvcmFnZS5nZXRJdGVtKCdjdXJyZW50TGV2ZWwnKSB8fCAwO1xyXG5cdFx0dGhpcy5sZXZlbHMgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnbGV2ZWxzJykgPyBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdsZXZlbHMnKSkgOiByZXF1aXJlKCcuLi9sZXZlbHMnKTtcclxuXHRcdHRoaXMuaXNMZXZlbE92ZXIgPSBmYWxzZTtcclxuXHJcblx0XHR2YXIgZyA9IHRoaXMucGFwZXIuZ3JhZGllbnQoXCJyKDAuNSwgMC41LCAwLjUpI2ZmZi1yZ2JhKDI1NSwgMjU1LCAyNTUsIDApXCIpO1xyXG5cdFx0dGhpcy50cmFqZWN0b3J5TGluZSA9XHJcblx0XHRcdHRoaXMucGFwZXJcclxuXHRcdFx0XHQucGF0aCgnJylcclxuXHRcdFx0XHQuYXR0cih7XHJcblx0XHRcdFx0XHRmaWxsOiAndHJhbnNwYXJlbnQnLFxyXG5cdFx0XHRcdFx0c3Ryb2tlOiBnLFxyXG5cdFx0XHRcdFx0c3Ryb2tlV2lkdGg6IDMsXHJcblx0XHRcdFx0XHRzdHJva2VEYXNoYXJyYXk6ICczcHgnXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cclxuXHRcdHRoaXMuX2JpbmRFdmVudHMoKTtcclxuXHR9XHJcblx0X2JpbmRFdmVudHMoKSB7XHJcblx0XHQkKCcjaW50ZXJmYWNlJykub24oJ2NsaWNrJywgKGUpID0+IHRoaXMudXNlckFjdGlvbihlKSk7XHJcblxyXG5cdFx0aWYoaGVscGVyLm1vYmlsZUFuZFRhYmxldGNoZWNrKCkpIHtcclxuXHRcdFx0JCgnI2dhbWUnKS5vbigndG91Y2hzdGFydCcsIChlKSA9PiB7XHJcblx0XHRcdFx0dGhpcy50cmFqZWN0b3J5TGluZVNob3coZS50b3VjaGVzWzBdKTtcclxuXHRcdFx0XHQkKCcjZ2FtZScpLm9uKCd0b3VjaG1vdmUnLCAoZSkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy50cmFqZWN0b3J5TGluZVNob3coZS50b3VjaGVzWzBdKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQkKCcjZ2FtZScpLm9uKCd0b3VjaGVuZCcsIChlKSA9PiB7XHJcblx0XHRcdFx0JCgnI2dhbWUnKS5vZmYoJ3RvdWNobW92ZScpO1xyXG5cdFx0XHRcdHRoaXMudXNlckFjdGlvbihlKTtcclxuXHRcdFx0XHR0aGlzLnRyYWplY3RvcnlMaW5lLmF0dHIoe2Q6ICcnfSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0JCgnI2dhbWUnKS5vbignbW91c2Vkb3duJywgKGUpID0+IHtcclxuXHRcdFx0XHR0aGlzLnRyYWplY3RvcnlMaW5lU2hvdyhlKTtcclxuXHRcdFx0XHQkKCcjZ2FtZScpLm9uKCdtb3VzZW1vdmUnLCAoZSkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy50cmFqZWN0b3J5TGluZVNob3coZSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHQkKCcjZ2FtZScpLm9uKCdtb3VzZXVwJywgKGUpID0+IHtcclxuXHRcdFx0XHQkKCcjZ2FtZScpLm9mZignbW91c2Vtb3ZlJyk7XHJcblx0XHRcdFx0dGhpcy51c2VyQWN0aW9uKGUpO1xyXG5cdFx0XHRcdHRoaXMudHJhamVjdG9yeUxpbmUuYXR0cih7ZDogJyd9KTtcclxuXHRcdFx0fSlcclxuXHRcdH1cclxuXHR9XHJcblx0dHJhamVjdG9yeUxpbmVTaG93KGUpIHtcclxuXHRcdGlmKCF0aGlzLmxldmVsLnVzZXJQYXRoLnBvaW50cy5sZW5ndGggfHwgIXRoaXMubGV2ZWwuc3RlcHNMZWZ0KSByZXR1cm47XHJcblxyXG5cdFx0bGV0IHAgPSB0aGlzLmxldmVsLnVzZXJQYXRoLnBvaW50c1t0aGlzLmxldmVsLnVzZXJQYXRoLnBvaW50cy5sZW5ndGgtMV07XHJcblx0XHR2YXIgbG93ZXIgPSBoZWxwZXIuZ2V0bG9uZ9Chb29yZHNMaW5lKHAueCwgcC55LCBlLmNsaWVudFgvdGhpcy5nYW1lLnpvb20sIGUuY2xpZW50WS90aGlzLmdhbWUuem9vbSwgMS41KTtcclxuXHRcdHZhciB1cHBlciA9IGhlbHBlci5nZXRsb25n0KFvb3Jkc0xpbmUoZS5jbGllbnRYL3RoaXMuZ2FtZS56b29tLCBlLmNsaWVudFkvdGhpcy5nYW1lLnpvb20sIHAueCwgcC55LCAyKTtcclxuXHJcblx0XHR0aGlzLnRyYWplY3RvcnlMaW5lLmF0dHIoe1xyXG5cdFx0XHRkOiAnTScgKyAgbG93ZXIueCArICcsJyArIGxvd2VyLnkgKyAnTCcgKyB1cHBlci54ICsgJywnICsgdXBwZXIueVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cdHJlc2l6ZSgpIHtcclxuXHRcdHRoaXMucGFwZXIuYXR0cih7XHJcblx0XHRcdHdpZHRoOiB0aGlzLmdhbWUudyxcclxuXHRcdFx0aGVpZ2h0OiB0aGlzLmdhbWUuaFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5yZXN0YXJ0TGV2ZWwoKTtcclxuXHR9XHJcblxyXG5cdHVzZXJBY3Rpb24oZSkge1xyXG5cdFx0aWYoZS50YXJnZXQudGFnTmFtZSA9PT0gJ0JVVFRPTicpIHJldHVybjtcclxuXHJcblx0XHR2YXIgeCA9IE1hdGgucm91bmQoKGUuY2xpZW50WCB8fCBlLmNoYW5nZWRUb3VjaGVzWzBdLmNsaWVudFgpL3RoaXMuZ2FtZS56b29tKTtcclxuXHRcdHZhciB5ID0gTWF0aC5yb3VuZCgoZS5jbGllbnRZIHx8IGUuY2hhbmdlZFRvdWNoZXNbMF0uY2xpZW50WSkvdGhpcy5nYW1lLnpvb20pO1xyXG5cclxuXHRcdGlmKHRoaXMubGV2ZWwuYXJlYXMuYWN0aXZhdGVBcmVhKHgsIHkpICYmIHRoaXMubGV2ZWwuc3RlcHNMZWZ0ICYmICF0aGlzLmlzTGV2ZWxPdmVyKSB7XHJcblx0XHRcdHRoaXMubGV2ZWwuc3RlcHNMZWZ0LS07XHJcblx0XHRcdHRoaXMubGV2ZWwuY2xpY2tzKys7XHJcblx0XHRcdHRoaXMubGV2ZWwudXBkYXRlKCk7XHJcblx0XHRcdHRoaXMubGV2ZWwudXNlclBhdGguYWRkUG9pbnQoeCwgeSk7XHJcblx0XHRcdHRoaXMubGV2ZWwudXNlci5hZGRDaXJjbGUoeCwgeSwgJ3VzZXInKTtcclxuXHRcdFx0dGhpcy5sZXZlbC5jaGVja0xldmVsT3ZlcigpO1xyXG5cdFx0XHR0aGlzLmdhbWUuaW50ZXJmYWNlLnVwZGF0ZUdhbWVJbmZvKCk7XHJcblx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjbGlja3MnLCB0aGlzLmxldmVsLmNsaWNrcyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRsb2FkTGV2ZWwobHZsID0gdGhpcy5jdXJyZW50TGV2ZWwsIGlzTmV3ID0gdHJ1ZSkge1xyXG5cdFx0aWYodGhpcy5sZXZlbHNbbHZsXSkge1xyXG5cdFx0XHR0aGlzLmN1cnJlbnRMZXZlbCA9IGx2bDtcclxuXHJcblx0XHRcdHRoaXMuZGVsZXRlTGV2ZWwoKTtcclxuXHRcdFx0dGhpcy5sZXZlbCA9IG5ldyBMZXZlbCh0aGlzLCBpc05ldywgdGhpcy5sZXZlbHNbbHZsXSk7XHJcblx0XHRcdHRoaXMuZ2FtZS5pbnRlcmZhY2UudXBkYXRlR2FtZUluZm8oKTtcclxuXHJcblx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjdXJyZW50TGV2ZWwnLCB0aGlzLmN1cnJlbnRMZXZlbCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLmdhbWUuYWpheFJlcXVlc3RzLnJlcXVlc3ROZXdMZXZlbHMoKTtcclxuXHRcdH1cclxuXHR9XHJcblx0ZGVsZXRlTGV2ZWwoKSB7XHJcblx0XHRpZih0aGlzLmxldmVsKSB7XHJcblx0XHRcdHRoaXMubGV2ZWwuc3ZnLnJlbW92ZSgpO1xyXG5cdFx0XHR0aGlzLmxldmVsID0gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdG5leHRMZXZlbCgpIHtcclxuXHRcdGlmKCF0aGlzLmlzTGV2ZWxPdmVyKSB7XHJcblx0XHRcdHRoaXMubG9hZExldmVsKHRoaXMuY3VycmVudExldmVsKzEsIHRydWUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRiYWNrTGV2ZWwoKSB7XHJcblx0XHRpZighdGhpcy5pc0xldmVsT3Zlcikge1xyXG5cdFx0XHR0aGlzLmxvYWRMZXZlbCh0aGlzLmN1cnJlbnRMZXZlbC0xLCB0cnVlKTtcclxuXHRcdH1cclxuXHR9XHJcblx0cmVzdGFydExldmVsKCkge1xyXG5cdFx0aWYoIXRoaXMuaXNMZXZlbE92ZXIpIHtcclxuXHRcdFx0dGhpcy5sb2FkTGV2ZWwodGhpcy5jdXJyZW50TGV2ZWwsIGZhbHNlKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUGxheTtcclxuIiwiY29uc3QgaGVscGVyID0gcmVxdWlyZSgnLi4vbWl4aW5zL2hlbHBlcicpO1xyXG5cclxuY2xhc3MgU2V0dGluZ3Mge1xyXG5cdGNvbnN0cnVjdG9yKGdhbWUpIHtcclxuXHRcdHRoaXMuZ2FtZSA9IGdhbWU7XHJcblxyXG5cdFx0dGhpcy5zY2VuZSA9ICQoJyNzZXR0aW5ncycpO1xyXG5cclxuXHRcdHRoaXMucHJvcE11c2ljID0gJCgnI3Byb3BNdXNpYycpO1xyXG5cdFx0dGhpcy5wcm9wRWZmZWN0ID0gJCgnI3Byb3BFZmZlY3QnKTtcclxuXHRcdHRoaXMucHJvcExhbmcgPSAkKCcjcHJvcExhbmcnKTtcclxuXHRcdHRoaXMucHJvcFJlc2V0ID0gJCgnI3Byb3BSZXNldCcpO1xyXG5cclxuXHRcdHRoaXMuY3VyTGFuZyA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdsYW5nJyktMCB8fCAwO1xyXG5cdFx0dGhpcy5sYW5ncyA9IFsnZW4nLCAncnUnXTtcclxuXHRcdHRoaXMubGFuZyA9IHRoaXMubGFuZ3NbdGhpcy5jdXJMYW5nXTtcclxuXHJcblx0XHR0aGlzLmlzTXVzaWMgPSB0cnVlO1xyXG5cdFx0dGhpcy5pc0dyYXBoaWNzID0gdHJ1ZTtcclxuXHJcblx0XHR0aGlzLl9iaW5kRXZlbnRzKCk7XHJcblx0fVxyXG5cdF9iaW5kRXZlbnRzKCkge1xyXG5cdFx0dGhpcy5wcm9wTXVzaWMuY2hpbGRyZW4oKS5vbignY2xpY2snLCAoKSA9PiB0aGlzLnRvZ2dsZU11c2ljKCkpO1xyXG5cdFx0dGhpcy5wcm9wRWZmZWN0LmNoaWxkcmVuKCkub24oJ2NsaWNrJywgKCkgPT4gdGhpcy50b2dnbGVFZmZlY3QoKSk7XHJcblx0XHR0aGlzLnByb3BMYW5nLmNoaWxkcmVuKCkub24oJ2NsaWNrJywgKCkgPT4gdGhpcy5zZWxlY3RMYW5nKCkpO1xyXG5cdFx0dGhpcy5wcm9wUmVzZXQuY2hpbGRyZW4oKS5vbignY2xpY2snLCAoKSA9PiB0aGlzLnJlc2V0R2FtZSgpKTtcclxuXHR9XHJcblxyXG5cdHRvZ2dsZU11c2ljKCkge1xyXG5cdFx0dGhpcy5pc011c2ljID0gIXRoaXMuaXNNdXNpYztcclxuXHJcblx0XHR0aGlzLnByb3BNdXNpYy5jaGlsZHJlbigpLmh0bWwodGhpcy5pc011c2ljID8gJ09OJyA6ICdPRkYnKTtcclxuXHRcdHRoaXMuaXNNdXNpYyA/IHRoaXMuZ2FtZS5tdXNpYy5wbGF5KCkgOiB0aGlzLmdhbWUubXVzaWMuc3RvcCgpO1xyXG5cdH1cclxuXHRyZXNldEdhbWUoKSB7XHJcblx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnY3VycmVudExldmVsJywgMCk7XHJcblx0fVxyXG5cdHRvZ2dsZUVmZmVjdCgpIHtcclxuXHRcdHRoaXMuaXNHcmFwaGljcyA9ICF0aGlzLmlzR3JhcGhpY3M7XHJcblxyXG5cdFx0dGhpcy5wcm9wRWZmZWN0LmNoaWxkcmVuKCkuaHRtbCh0aGlzLmlzR3JhcGhpY3MgPyAnT04nIDogJ09GRicpO1xyXG5cdFx0dGhpcy5nYW1lLmVmZmVjdC50b2dnbGUodGhpcy5pc0dyYXBoaWNzKTtcclxuXHR9XHJcblx0c2VsZWN0TGFuZygpIHtcclxuXHRcdHRoaXMuY3VyTGFuZyA9IGhlbHBlci5pblJhbmdlQXJyYXkodGhpcy5jdXJMYW5nICsgMSwgdGhpcy5sYW5ncyk7XHJcblx0XHR0aGlzLmxhbmcgPSB0aGlzLmxhbmdzW3RoaXMuY3VyTGFuZ107XHJcblxyXG5cdFx0dGhpcy5wcm9wTGFuZy5jaGlsZHJlbigpLmh0bWwodGhpcy5sYW5nLnRvVXBwZXJDYXNlKCkpO1xyXG5cdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2xhbmcnLCB0aGlzLmN1ckxhbmcpO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTZXR0aW5ncztcclxuIiwiY2xhc3MgU3BsYXNoIHtcclxuXHRjb25zdHJ1Y3RvcihnYW1lKSB7XHJcblx0XHR0aGlzLmdhbWUgPSBnYW1lO1xyXG5cdFx0XHJcblx0XHR0aGlzLnNwbGFzaCA9ICQoJyNzcGxhc2gnKTtcclxuXHR9XHJcblxyXG5cdHNob3coY2IpIHtcclxuXHRcdHRoaXMuc3BsYXNoXHJcblx0XHRcdC5jc3Moe1xyXG5cdFx0XHRcdG9wYWNpdHk6IDEsXHJcblx0XHRcdFx0ZGlzcGxheTogJ2Jsb2NrJ1xyXG5cdFx0XHR9KVxyXG5cdFx0XHQuZmFkZU91dCg0MDAsIGNiKTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU3BsYXNoOyIsIm1vZHVsZS5leHBvcnRzPXtcclxuICBcIk9uZVNpZ25hbElkXCI6IFwiZDQ1NmYyYzUtMGMxYi00YjFlLWIxYjEtYjQ5Y2Q5MWFjZGE4XCIsXHJcbiAgXCJHb29nbGVQbGF5SWRcIjogXCI4MTY5MjUwNjgwNlwiXHJcbn1cclxuIl19
