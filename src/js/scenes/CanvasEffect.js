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