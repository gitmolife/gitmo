<template>
<div class="icozogqfvdetwohsdglrbswgrejoxbdj" v-if="hide == true" v-show="hide == true" @click="hide = false">
	<div>
		<b><Fa :icon="faExclamationTriangle"/> {{ $ts.sensitive }}</b>
		<span>{{ $ts.clickToShow }}</span>
	</div>
</div>
<div class="kkjnbbplepmiyuadieoenjgutgcmtsvu" v-show="hide == false">
	<i v-show="playing == false"><Fa :icon="faEyeSlash" @click="hide = true" /></i>
	<div class="video_container">
		<video ref="VideoCast" class="video-js vjs-default-skin vjs-big-play-centered vjs-fluid" :title="video.name"></video>
	</div>
</div>
</template>

<script lang="ts">
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import { defineComponent } from 'vue';
import { faExclamationTriangle, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import * as os from '@/os';

export default defineComponent({
	name: "VideoCaster",
	props: {
		video: {
			type: Object,
			required: true
		}
	},
	data() {
		return {
			hide: true,
			playing: false,
			player: null,
			faExclamationTriangle,
			faEyeSlash,
			videoOptions: {
				autoplay: false,
				controls: true,
				preload: "auto",
				playbackRates: [0.5, 0.7, 1.0, 1.5, 2.0, 2.5],
				//poster: this.$props.video.thumbnailUrl, // FIXME: Generate video thumbnails..
				poster: '/assets/caster-play.jpg'
				sources: [{
					src: this.$props.video.url,
					type: "video/mp4"
				}]
			}
		};
	},
	created() {
		this.hide = (this.$store.state.nsfw === 'force') ? true : this.video.isSensitive && (this.$store.state.nsfw !== 'ignore');
	},
	mounted() {
		let vm = this;
		vm.player = videojs(vm.$refs.VideoCast, vm.videoOptions, function onPlayerReady() {
				//console.log('onPlayerReady', this);
				this.on("ended", function() {
					vm.playing = false;
				});
				this.on("play", function() {
					vm.playing = true;
				});
				this.on("pause", function() {
					vm.playing = false;
				});
				this.on("waiting", function() {
					vm.playing = false;
				});
		});
	},
	beforeDestroy() {
		if (this.player) {
				this.player.dispose();
		}
	}
});
</script>

<style lang="scss" scoped>
.kkjnbbplepmiyuadieoenjgutgcmtsvu {
	position: relative;

	> i {
		display: block;
		position: absolute;
		border-radius: 6px;
		background-color: var(--fg);
		color: var(--accentLighten);
		font-size: 14px;
		opacity: .5;
		padding: 3px 6px;
		text-align: center;
		cursor: pointer;
		top: 12px;
		right: 12px;
		z-index: 120;
	}

	> a {
		display: flex;
		justify-content: center;
		align-items: center;

		font-size: 3.5em;
		overflow: hidden;
		background-position: center;
		background-size: cover;
		width: 100%;
		height: 100%;
	}
}

.icozogqfvdetwohsdglrbswgrejoxbdj {
	display: flex;
	justify-content: center;
	align-items: center;
	background: #111;
	color: #fff;

	> div {
		display: table-cell;
		text-align: center;
		font-size: 12px;

		> b {
			display: block;
		}
	}
}

.video-js {
  position: relative !important;
  width: 100% !important;
	height: -webkit-fill-available !important;
}
.vjs-poster {
  position: absolute !important;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
}
</style>
