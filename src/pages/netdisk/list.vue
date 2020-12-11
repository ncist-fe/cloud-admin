<template>
    <view>
		<view class="uni-header">
			<button @click="showCreateFolder" class="uni-button" type="primary">新增文件夹</button>
			<view ref="input" class="input"></view>
			<button @click="uploadFile" class="uni-button" type="primary">上传文件</button>
			<uni-popup ref="folderPopup" type="dialog">
				<uni-popup-dialog mode="input" title="新增文件夹" placeholder="请输入文件夹名称" @confirm="confirmCreate"></uni-popup-dialog>
			</uni-popup>
		</view>
        <view class="uni-header">
			<view class="uni-group">
				<view class="title-icon">
					  <uni-icons size="16" type="home-filled"/>
					  <span
						v-for="(item, index) in pathStack"
						:key="item"
						@click="toPreviousFolder(index)">
						<span class="folder-name">{{ item === "/" || item === "" ? " 首页 " : item }}</span>
						<span v-if="item || item !== '/'">/</span>
					  </span>
				</view>
			</view>
        </view>
        <view class="uni-container">
            <uni-clientdb ref="dataQuery" :collection="collectionName" :options="options" :where="where" page-data="replace"
                :orderby="orderby" :getcount="true" :page-size="options.pageSize" :page-current="options.pageCurrent"
                v-slot:default="{data,pagination,loading,error}">
                <uni-table :loading="loading" :emptyText="error.message || '没有更多数据'" stripe>
                    <uni-tr>
                        <uni-th min-width="50" align="left">文件名</uni-th>
                        <uni-th width="100" align="center">上传人</uni-th>
						<uni-th width="100" align="center">文件大小</uni-th>
                        <uni-th width="160" align="center">添加时间</uni-th>
                        <uni-th width="160" align="center">操作</uni-th>
                    </uni-tr>
                    <uni-tr v-for="(item,index) in data" :key="index">
                        <uni-td align="left" v-if="item.isFolder">
							<span class="iconfont file-icon icon-folder"></span><a class="folder-name" @click="enterFolder(item.name)">{{item.name}}</a>
						</uni-td>
						<uni-td align="left" v-else>
							<span :class="['iconfont','file-icon', getFileType(item.name)]"></span>
							<span @click="fileClick(item.name, item.link, index)">{{item.name}}</span>
						</uni-td>
                        <uni-td align="center">{{item.createBy}}</uni-td>
						<uni-td align="center">{{item.isFolder ? '-': formatSize(item.size)}}</uni-td>
                        <uni-td align="center">
                            <uni-dateformat :date="item.createOn" :threshold = "[0,0]" format="yyyy-MM-dd hh:mm:ss"/>
                        </uni-td>
                        <uni-td align="center">
                            <view class="uni-group">
                                <button size="mini" @click="navigateTo('./edit?id='+item._id)" class="uni-button" type="primary">修改</button>
                                <button size="mini" @click="confirmDelete(item)" class="uni-button" type="warn">删除</button>
                            </view>
                        </uni-td>
                    </uni-tr>
                </uni-table>
                <view class="uni-pagination-box">
                    <uni-pagination show-icon :page-size="pagination.size" v-model="pagination.current" :total="pagination.count"
                        @change="onPageChanged" />
                </view>
            </uni-clientdb>
        </view>
		<!-- #ifndef H5 -->
		<fix-window />
		<!-- #endif -->
		<D-Player v-on:closeVideo="closeV" ref="mydplayer" v-show="video.show"></D-Player>
		<A-Player v-on:closeAudio="closeA" ref="myaplayer" v-show="audio.show"></A-Player>
		<uni-popup ref="imagePopup">
			<image :src="popUpImg" alt="" style="width:100%;height:100%" />
		</uni-popup>
    </view>
</template>

<script>
import { formatSize, checkFileType } from '@/js_sdk/netdisk/index.js'
import uniPopupDialog from '@/components/uni-popup/uni-popup-dialog.vue'
import DPlayer from './Dplayer.vue'
import APlayer from './Aplayer.vue'

import {
  mapState
} from 'vuex'
const db = uniCloud.database()
// 表查询配置
const dbCollectionName = 'opendb-netdisk-files'
const dbOrderBy = 'createOn desc'
// 分页配置
const pageSize = 20
const pageCurrent = 1

export default {
  computed: {
    ...mapState('user', ['userInfo']),
    where () {
      return {
        parent: this.pathStack.join('/').replace('//', '/')
      }
    }
  },
  components: {
    uniPopupDialog,
    'D-Player': DPlayer,
    'A-Player': APlayer
  },
  data  () {
    return {
      orderby: dbOrderBy,
      collectionName: dbCollectionName,
      options: {
        pageSize,
        pageCurrent
      },
      pathStack: ['/'],
      video: {
        show: false,
        index: -1, // 点击的元素
        // 记录正在播放视频的文件夹
        hash: ''
      },
      audio: {
        show: false,
        index: -1,
        hash: ''
      },
      popUpImg: ''
    }
  },
  mounted () {
    const input = document.createElement('input')
    input.type = 'file'
    input.style.display = 'none'
    input.id = 'file'
    input.onchange = (event) => {
      this.upload(event.target.files[0])
    }
    this.$refs.input.$el.appendChild(input)
  },
  methods: {
    formatSize (size) {
      return formatSize(size)
    },
    getFileType (name) {
      return 'icon-' + checkFileType(name)
    },
    confirmCreate (done, value) {
      done()
      uni.showLoading({
        title: '创建中'
      })
      this.saveFileInfo({
        name: value,
        isFolder: true
      })
    },
    saveFileInfo (file) {
      const fileObj = Object.assign({}, file)
      fileObj.parent = this.where.parent
      fileObj.createOn = new Date().toISOString()
      fileObj.createBy = this.userInfo.username
      db.collection(dbCollectionName).add(fileObj).catch(err => {
				    uni.showModal({
				        content: err.message || '请求服务失败',
				        showCancel: false
				    })
      }).finally(() => {
        uni.hideLoading()
        this.loadData()
      })
    },
    loadData (clear = true) {
			    this.$refs.dataQuery.loadData({
			        clear
			    })
    },
    onPageChanged (e) {
			    this.$refs.dataQuery.loadData({
			        current: e.current
			    })
    },
    uploadFile () {
      return document.getElementById('file').click()
    },
    upload (fileInfo) {
      if (fileInfo.size > 100 * 1024 * 1024) {
        uni.showModal({
          content: '目前仅支持上传100M以内文件',
          showCancel: false
        })
      } else {
        uni.showLoading({
          title: '上传中'
        })
        // 转换文件路径--异步操作
        const reader = new FileReader()
        reader.readAsDataURL(fileInfo)
        reader.onload = e => {
          this.uploadApi(e.target.result, fileInfo)
        }
      }
      console.log('file info', fileInfo)
    },
    uploadApi (filePath, fileInfo) {
      console.log()
      uniCloud.uploadFile({
        cloudPath: fileInfo.name,
        filePath: filePath
      }).then(res => {
        console.log('upload resut:', res)
        if (res.success) {
          this.saveFileInfo({
            name: fileInfo.name,
            size: fileInfo.size,
            link: res.fileID,
            isFolder: false
          })
        }
      })
    },
    enterFolder (name) {
      this.pathStack.push(name)
    },
    showCreateFolder () {
      this.$refs.folderPopup.open()
    },
    toPreviousFolder (index) {
			  if (index + 1 !== this.pathStack.length) {
        const target = this.pathStack.slice(0, index + 1)
        console.log('to target folder', target, 'index', index)
        this.pathStack = target
			  } else {
        uni.showToast({
          title: '已在该目录',
          icon: 'none'
        })
			  }
    },
    confirmDelete (file) {
      const tip = '确认删除' + (file.isFolder ? '文件夹' : '文件') + ':[' + file.name + ']?'
			    uni.showModal({
			        title: '提示',
			        content: tip,
			        success: (res) => {
			            res.confirm && this.delete(file._id)
			        }
			    })
    },
    async delete (id) {
			    uni.showLoading({
        title: '删除中',
			        mask: true
			    })
      await db.collection(dbCollectionName).doc(id).remove()
				    .then(res => {
          uni.showToast({
            title: '删除成功'
          })
				    }).catch(err => {
          uni.showModal({
            content: err.message || '请求服务失败',
            showCancel: false
          })
        }).finally(err => {
				        uni.hideLoading()
				    })
			    this.loadData(false)
    },
    fileClick (fileName, downloadUrl, index) {
      const fileType = checkFileType(fileName)
      if (fileType === 'video') {
        this.playVideo(downloadUrl, index)
      } else if (fileType === 'image') {
        this.showImage(downloadUrl, index)
      } else if (fileType === 'audio') {
        this.playAudio(downloadUrl, index)
      } else {
        this.downloadFile(fileName, downloadUrl)
      }
    },
    playVideo (playUrl, index) {
      const video = {
        playUrl: playUrl
      }
      if (!this.video.show) {
        this.video.index = index
        this.video.show = true
        this.video.hash = playUrl
        this.$refs.mydplayer.play(video)
      } else {
        this.video.index = index
        this.$refs.mydplayer.switch(video)
        this.video.hash = playUrl
      }
    },
    playAudio (playUrl, index) {
      const audio = {
        url: playUrl
      }
      if (!this.audio.show) {
        this.audio.index = index
        this.audio.show = true
        this.audio.hash = playUrl
        this.$refs.myaplayer.play(audio)
      } else {
        this.audio.index = index
        this.$refs.myaplayer.switch(audio)
        this.audio.hash = playUrl
      }
    },
    closeV () {
      this.video.show = false
      this.video.index = -1
    },
    closeA () {
      this.audio.show = false
      this.audio.index = -1
    }
  }
}
</script>
<style>
	/* #ifndef H5 */
	page {
		padding-top: 85px;
	}
	/* #endif */
	.folder-name {
		padding-left: 2px;
		padding-right: 2px;
		font-weight: bold;
	}
	.folder-name:hover {
		color: #007AFF;
		cursor:pointer;
	}
	.file-icon {
		margin-right: 5px;
	}
</style>
