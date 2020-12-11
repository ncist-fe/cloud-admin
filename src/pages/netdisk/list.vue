<template>
    <view>
		<view class="uni-header">
			<button @click="showCreateFolder" class="uni-button" type="primary">新增文件夹</button>
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
						<span>{{ item === "/" || item === "" ? " 首页 " : item }}</span>
						<span style="padding-left:2px" v-if="item || item !== '/'">/</span>
					  </span>
				</view>
			</view>
        </view>
        <view class="uni-container">
            <uni-clientdb ref="dataQuery" :collection="collectionName" :options="options" :where="where" page-data="replace"
                :orderby="orderby" :getcount="true" :page-size="options.pageSize" :page-current="options.pageCurrent"
                v-slot:default="{data,pagination,loading,error}">
                <uni-table :loading="loading" :emptyText="error.message || '没有更多数据'" stripe type="selection"
				 @selection-change="selectionChange">
                    <uni-tr>
                        <uni-th min-width="50" align="left">文件名</uni-th>
                        <uni-th width="100" align="center">上传人</uni-th>
						<uni-th width="100" align="center">文件大小</uni-th>
                        <uni-th width="160" align="center">添加时间</uni-th>
                        <uni-th width="160" align="center">操作</uni-th>
                    </uni-tr>
                    <uni-tr v-for="(item,index) in data" :key="index">
                        <uni-td align="left" v-if="item.isFolder">
							<span class="iconfont">&#xe600;</span><a class="folder-name" @click="enterFolder(item.name)">{{item.name}}</a>
						</uni-td>
						<uni-td align="left" v-else>{{item.name}}</uni-td>
                        <uni-td align="center">{{item.createBy}}</uni-td>
						<uni-td align="center">{{item.isFolder ? '-': '2'}}</uni-td>
                        <uni-td align="center">
                            <uni-dateformat :date="item.createOn" :threshold = "[0,0]" format="yyyy-MM-dd hh:mm:ss"/>
                        </uni-td>
                        <uni-td align="center">
                            <view class="uni-group">
                                <button size="mini" @click="navigateTo('./edit?id='+item._id)" class="uni-button" type="primary">修改</button>
                                <button size="mini" @click="confirmDelete(item.permission_id)" class="uni-button" type="warn">删除</button>
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
    </view>
</template>

<script>
    const db = uniCloud.database()
    // 表查询配置
    const dbCollectionName = 'opendb-netdisk-files'
    const dbOrderBy = 'createOn desc'
    // 分页配置
    const pageSize = 20
    const pageCurrent = 1
	import uniPopupDialog from '@/components/uni-popup/uni-popup-dialog.vue'
	import {
		mapState
	} from 'vuex'

    export default {
		computed: {
			...mapState('user', ['userInfo']),
			where() {
				return {
					parent: this.pathStack.join('/')
				}
			}
		},
		components:{
			uniPopupDialog
		},
        data() {
            return {
                orderby: dbOrderBy,
                collectionName: dbCollectionName,
                options: {
                    pageSize,
                    pageCurrent
                },
				pathStack: ['/']
            }
        },
		onLoad() {
		},
        methods: {
			confirmCreate (done, value) {
				console.log('value is:', value)
				done()
				uni.showLoading({
					title:'创建中'
				})
				db.collection(dbCollectionName).add({
					parent: this.pathStack.join('/'),
					name: value,
					isFolder: true,
					createOn: new Date().toISOString(),
					createBy: this.userInfo.username
				}).catch((err) => {
                    uni.showModal({
                        content: err.message || '请求服务失败',
                        showCancel: false
                    })
                }).finally(() => {
                    uni.hideLoading()
					this.$refs.dataQuery.loadData()
                })
			},
			enterFolder(name) {
				this.pathStack.push(name)
			},
			showCreateFolder() {
				this.$refs.folderPopup.open()
			},
			toPreviousFolder(index) {
			  if (index + 1 !== this.pathStack.length) {
				const target = this.pathStack.slice(0, index + 1);
				console.log("to target folder", target, "index", index);
				this.pathStack = target
			  } else {
				  uni.showToast({
				  	title: '已在该目录',
					icon: 'none'
				  })
			  }
			},
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
		padding-left: 5px;
		font-weight: bold;
	}
	.folder-name:hover {
		color: #007AFF;
		
cursor:pointer;
	}
</style>
