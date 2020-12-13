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
              :key="index"
              @click="toPreviousFolder(index)">
              <span class="file-name">{{ item === "/" || item === "" ? " 首页 " : item }}</span>
              <span v-if="item || item !== '/'">/</span>
              </span>
          </view>
        </view>
      </view>
        <view class="uni-container">
            <uni-clientdb ref="udb" :collection="collectionName" :options="options" :where="where" page-data="replace"
                :orderby="orderby" :getcount="true" :page-size="options.pageSize" :page-current="options.pageCurrent"
                v-slot:default="{data,pagination,loading,error}">
                <uni-table :loading="loading" :emptyText="error.message || '没有更多数据'" stripe>
                    <uni-tr>
                        <uni-th min-width="50" align="left">文件名</uni-th>
                        <uni-th width="100" align="center">上传人</uni-th>
                        <uni-th width="100" align="center">文件大小</uni-th>
                        <uni-th width="170" align="center">添加时间</uni-th>
                        <uni-th width="160" align="center">操作</uni-th>
                    </uni-tr>
                    <uni-tr v-for="(item,index) in data" :key="index">
                      <uni-td align="left">
                        <view class="uni-flex uni-row">
                          <span v-if="item.isFolder" class="flex-item iconfont file-icon icon-folder"></span>
                          <span v-else :class="['iconfont','file-icon', getFileType(item.name)]"></span>
                          <view v-if="item.editMode" class="flex-item uni-flex uni-row">
                            <input class="edit-input uni-input" v-model="editFileName"/>
                            <uni-icons type="checkmarkempty" class="edit-icon" size="24" color="#09AAFF" @click="confirmFileName(item, index)"></uni-icons>
                            <uni-icons type="closeempty" class="edit-icon" size="24" color="#09AAFF" @click="cancelFileName(index)"></uni-icons>
                          </view>
                          <view v-else class="flex-item">
                            <a v-if="item.isFolder" class="folder-name" @click="enterFolder(item.name)">{{item.name}}</a>
                            <a v-else @click="fileClick(item, index)" class="file-name">{{item.name}}</a>
                          </view>
                        </view>
                      </uni-td>
                      <uni-td align="center">{{item.createBy}}</uni-td>
                      <uni-td align="center">{{item.isFolder ? '-': formatSize(item.size)}}</uni-td>
                      <uni-td align="center">
                          <uni-dateformat :date="item.createOn" :threshold = "[0,0]" format="yyyy-MM-dd hh:mm:ss"/>
                      </uni-td>
                      <uni-td align="center">
                          <view class="uni-group">
                              <button size="mini" @click="triggerRename(item, index)" class="uni-button" type="primary">重命名</button>
                              <button size="mini" @click="promoteDelete(item)" class="uni-button" type="warn">删除</button>
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
      <img :src="popUpImg" alt="" style="width:100%;height:100%" />
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
const fileCollectionName = 'opendb-netdisk-files'
const dbOrderBy = 'isFolder desc, createOn desc'
// 分页配置
const pageSize = 20
const pageCurrent = 1
const logCollectionName = 'opendb-netdisk-logs'

const readUploadedFileAsUrl = (inputFile) => {
  const temporaryFileReader = new FileReader()

  return new Promise((resolve, reject) => {
    temporaryFileReader.onerror = () => {
      temporaryFileReader.abort()
      reject(new DOMException('Problem parsing input file.'))
    }

    temporaryFileReader.onload = () => {
      resolve(temporaryFileReader.result)
    }
    temporaryFileReader.readAsDataURL(inputFile)
  })
}

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
      collectionName: fileCollectionName,
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
      popUpImg: '',
      editFileName: '',
      editFileIndex: -1
    }
  },
  mounted () {
    const input = document.createElement('input')
    input.type = 'file'
    input.style.display = 'none'
    input.id = 'file'
    input.multiple = true
    input.onchange = (event) => {
      this.upload(event.target.files)
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
    isNameIllegal (targetName, isFolder) {
      if (targetName === '') {
        uni.showModal({
          content: isFolder ? '文件夹' : '文件' + '名称不能为空',
          showCancel: false
        })
        return true
      }
      const reg = /[\\/:*?"<>|]/
      if (reg.test(targetName)) {
        uni.showModal({
          content: isFolder ? '文件夹' : '文件' + '名称不合法:' + targetName,
          showCancel: false
        })
        this.saveActionLog('illegal-name', {
          name: targetName,
          parent: this.where.parent
        })
        return true
      }
      if (!isFolder) {
        return false
      }
      for (const _item of this.$refs.udb.dataList) {
        if (_item.isFolder && _item.name === targetName) {
          uni.showModal({
            content: '当前目录已存在同名文件夹:' + targetName,
            showCancel: false
          })
          this.saveActionLog('duplicate-folder', {
            name: targetName,
            parent: this.where.parent
          })
          return true
        }
      }
      return false
    },
    confirmCreate (done, value) {
      done()
      const folderName = value.trim()
      if (this.isNameIllegal(folderName, true)) {
        return
      }
      uni.showLoading({
        title: '创建中'
      })
      this.saveFileInfo({
        name: folderName,
        isFolder: true
      }).then(() => {
        uni.hideLoading()
        uni.showToast({
          title: '创建成功'
        })
        this.saveActionLog('create-folder', {
          name: folderName,
          parent: this.where.parent
        })
      })
    },
    saveActionLog (type, detail) {
      db.collection(logCollectionName).add({
        actionBy: this.userInfo.username,
        actionDetail: detail,
        actionType: type
      })
    },
    saveFileInfo (file) {
      const fileObj = Object.assign({}, file)
      fileObj.parent = this.where.parent
      fileObj.createBy = this.userInfo.username
      return db.collection(fileCollectionName).add(fileObj).catch(err => {
        uni.showModal({
          content: err.message || '请求服务失败',
          showCancel: false
        })
      }).finally(() => {
        this.loadData()
      })
    },
    loadData (clear = true) {
      this.$refs.udb.loadData({
        clear
      })
    },
    onPageChanged (e) {
      this.$refs.udb.loadData({
        current: e.current
      })
    },
    uploadFile () {
      return document.getElementById('file').click()
    },
    async upload (files) {
      console.log('select files:', files)
      for (const fileInfo of files) {
        if (fileInfo.size > 100 * 1024 * 1024) {
          uni.showModal({
            content: '目前仅支持上传100M以内文件, 【' + fileInfo.name + '】超过限制',
            showCancel: false
          })
          return
        }
      }
      uni.showLoading({
        title: files.length + '个文件上传中'
      })
      const uploadTaks = []
      for (const file of files) {
        const filePath = await readUploadedFileAsUrl(file)
        uploadTaks.push(this.uploadApi(filePath, file))
      }
      console.log('submit tasks:', uploadTaks)
      Promise.allSettled(uploadTaks).then(resp => {
        uni.hideLoading()
        uni.showToast({
          title: files.length + '个文件上传成功'
        })
      })
    },
    async uploadApi (filePath, fileInfo) {
      const uploadResp = await uniCloud.uploadFile({
        cloudPath: fileInfo.name,
        filePath: filePath
      })
      if (uploadResp.success) {
        const fileObj = {
          name: fileInfo.name,
          size: fileInfo.size,
          link: uploadResp.fileID,
          isFolder: false,
          fileType: checkFileType(fileInfo.name)
        }
        this.saveActionLog('upload-file', fileObj)
        return this.saveFileInfo(fileObj)
      } else {
        return Promise.reject(new Error('upload fail:' + fileInfo.name))
      }
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
        this.pathStack = target
      } else {
        uni.showToast({
          title: '已在该目录',
          icon: 'none'
        })
      }
    },
    promoteDelete (file) {
      const tip = '确认删除' + (file.isFolder ? '文件夹' : '文件') + ':【' + file.name + '】?'
      uni.showModal({
        title: '提示',
        content: tip,
        success: (res) => {
          res.confirm && this.delete(file)
        }
      })
    },
    async delete (file) {
      uni.showLoading({
        title: '删除中',
        mask: true
      })
      await db.collection(fileCollectionName).doc(file._id).remove()
        .then(res => {
          uni.hideLoading()
          uni.showToast({
            title: '删除成功'
          })
          if (!file.isFolder) {
            uniCloud.deleteFile({
              fileList: [file.link]
            }).then(resp => {
              console.log('cloud delete file:', resp)
            })
            this.saveActionLog('delete-file', file)
          } else {
            this.saveActionLog('delete-folder', file)
          }
        }).catch(err => {
          uni.hideLoading()
          uni.showModal({
            content: err.message || '请求服务失败',
            showCancel: false
          })
        })
      this.loadData(false)
    },
    fileClick (file, index) {
      const fileName = file.name
      const downloadUrl = file.link
      const fileType = checkFileType(fileName)
      if (fileType === 'video') {
        this.playVideo(downloadUrl, index)
        this.saveActionLog('play-video', file)
      } else if (fileType === 'image') {
        this.showImage(downloadUrl, index)
        this.saveActionLog('show-image', file)
      } else if (fileType === 'audio') {
        this.playAudio(downloadUrl, index)
        this.saveActionLog('play-audio', file)
      } else {
        this.downloadFile(fileName, downloadUrl)
      }
    },
    showImage (downloadUrl) {
      this.popUpImg = downloadUrl
      this.$refs.imagePopup.open()
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
    },
    triggerRename (file, index) {
      if (this.editFileIndex !== -1) {
        this.cancelFileName(this.editFileIndex)
      }
      file.editMode = true
      this.editFileIndex = index
      this.editFileName = file.name
      this.$set(this.$refs.udb.dataList, index, file)
    },
    cancelFileName (index) {
      const previousFile = this.$refs.udb.dataList[index]
      previousFile.editMode = false
      this.$set(this.$refs.udb.dataList, index, previousFile)
      this.editFileIndex = -1
    },
    async confirmFileName (file, index) {
      if (this.isNameIllegal(this.editFileName.trim(), file.isFolder)) {
        return
      }
      uni.showLoading({
        title: '重命名中'
      })
      if (file.isFolder) {
        this.saveActionLog('rename-folder', {
          before: this.getAbsoluteName(file.name),
          after: this.getAbsoluteName(this.editFileName)
        })
        await Promise.allSettled([this.updateFolderNameOfChild(file), this.updateSingleName(file)]).then(res => {
          uni.hideLoading()
          uni.showToast({
            title: '重命名成功'
          })
        }).catch(err => {
          uni.hideLoading()
          uni.showModal({
            content: err.message || '请求服务失败',
            showCancel: false
          })
        })
        this.loadData(false)
      } else {
        this.saveActionLog('rename-file', {
          before: this.getAbsoluteName(file.name),
          after: this.getAbsoluteName(this.editFileName)
        })
        await this.updateSingleName(file).then(res => {
          uni.hideLoading()
          uni.showToast({
            title: '重命名成功'
          })
        }).catch(err => {
          uni.hideLoading()
          uni.showModal({
            content: err.message || '请求服务失败',
            showCancel: false
          })
        })
        this.loadData(false)
      }
    },
    updateSingleName (file) {
      return db.collection(fileCollectionName).doc(file._id).update({
        name: this.editFileName.trim()
      })
    },
    async updateFolderNameOfChild (file) {
      const beforeParent = this.getAbsoluteName(file.name)
      const afterParent = this.getAbsoluteName(this.editFileName.trim())
      const $ = db.command.aggregate
      const countResp = await db.collection(fileCollectionName).aggregate()
        .match({
          parent: new RegExp('^' + beforeParent)
        })
        .group({
          _id: '$parent',
          num: $.sum(1)
        })
        .end()
      const tasks = []
      for (const _item of countResp.result.data) {
        const _from = _item._id
        const _to = _item._id.replace(beforeParent, afterParent)
        tasks.push(db.collection(fileCollectionName).where({
          parent: _from
        }).update({
          parent: _to
        }))
      }
      return tasks
    },
    getAbsoluteName (name) {
      let currentPath = this.where.parent
      if (currentPath === '/') {
        currentPath = ''
      }
      return currentPath + '/' + name
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
  .folder-name, .file-name {
    padding-left: 2px;
    padding-right: 2px;
    height: 26px;
    line-height: 26px;
  }
  .folder-name {
    font-weight: bold;
  }
  .file-name:hover, .folder-name:hover {
    color: #007AFF;
    cursor:pointer;
  }
  .file-icon {
    margin-right: 5px;
    height: 26px;
    line-height: 26px;
  }
  .edit-input {
    padding: 0 0 0 5px;
    width: 200px;
    height: 24px;
    vertical-align: middle;
    border: 1px solid #09aaff;
    background: #fff;
    border-radius: 2px;
    color: #666;
    font-size: 14px;
    line-height: 1.7;
  }
  .edit-icon {
    height: 24px;
    width: 24px;
    border: #09aaff 1px solid;
    cursor: pointer;
    margin: 0 5px;
  }
</style>
