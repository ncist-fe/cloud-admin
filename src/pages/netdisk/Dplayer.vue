<template>
  <!-- <div class="player-content">
        <div class="player">
          <div class="close"><span @click="close"> 关闭</span></div>

        </div>
      </div> -->

  <div ref="dplayer"></div>
</template>
<script>
import DPlayer from 'dplayer'

export default {
  data () {
    return {
      dp: undefined,
      options: {
        autoplay: false,
        theme: '#b7daff',
        loop: false,
        screenshot: false,
        hotkey: true,
        preload: 'auto',
        volume: 0.7
      },
      name: ''
    }
  },
  mounted () {
    if (!this.dp) {
      this.$nextTick(() => {
        this.dp = new DPlayer({
          container: this.$refs.dplayer,
          ...this.options,
          video: {
            type: 'auto'
          }
        })
      })
    }
  },
  methods: {
    play (video) {
      console.log('现在播放：', video.playUrl)
      this.name = video.name
      this.dp.switchVideo({
        url: video.playUrl
      })
      this.dp.on('error', () => {
        this.close()
      })
      this.dp.play()
    },
    switch (video) {
      this.name = video.name
      this.dp.switchVideo({
        url: video.playurl
      })
      this.play(video)
    },
    close () {
      this.dp.pause()
      // this.dp.destroy()
      this.$emit('closeVideo')
    }
  }
}
</script>
<style>
.dplayer {
  position: fixed !important;
  left: 0;
  bottom: 0;
  height: 300px;
  z-index: 10;
}

@media (max-width: 768px) {
  .dplayer {
    width: 100%;
  }
}

@media (min-width: 769px) {
  .dplayer {
    width: 600px;
  }
}
</style>
