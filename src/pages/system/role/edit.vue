<template>
  <view class="uni-container">
    <uni-forms ref="form" v-model="formData" :rules="rules" validateTrigger="bind" @submit="submit">
      <uni-forms-item name="role_id" label="角色Id">
        <input disabled placeholder="请输入姓名" @input="binddata('role_id', $event.detail.value)" class="uni-input-border uni-disabled"
         :value="formData.role_id" />
      </uni-forms-item>
      <uni-forms-item name="role_name" label="角色名">
        <input placeholder="请输入角色名" @input="binddata('role_name', $event.detail.value)" class="uni-input-border" :value="formData.role_name" />
      </uni-forms-item>
      <uni-forms-item name="permission" label="权限列表">
        <uni-data-checklist multiple v-if="permissions.length" :value="formData.permission" :range="permissions" @change="binddata('permission', $event.detail.value)"></uni-data-checklist>
        <view v-else class="uni-form-item-empty">
          暂无
        </view>
      </uni-forms-item>
      <uni-forms-item name="comment" label="备注">
        <textarea placeholder="请输入备注" @input="binddata('comment', $event.detail.value)" class="uni-textarea-border" :value="formData.comment"></textarea>
      </uni-forms-item>
      <view class="uni-button-group">
        <button style="width: 100px;" type="primary" class="uni-button" @click="submitForm">提交</button>
        <navigator open-type="navigateBack" style="margin-left: 15px;"><button style="width: 100px;" class="uni-button">返回</button></navigator>
      </view>
    </uni-forms>
  </view>
</template>

<script>
import validator from '@/js_sdk/validator/uni-id-roles.js'

const db = uniCloud.database()
const dbCollectionName = 'uni-id-roles'

function getValidator (fields) {
  const reuslt = {}
  for (const key in validator) {
    if (fields.includes(key)) {
      reuslt[key] = validator[key]
    }
  }
  return reuslt
}

export default {
  data () {
    return {
      formData: {
        role_id: '',
        role_name: '',
        permission: [],
        comment: ''
      },
      rules: {
        ...getValidator(['role_id', 'role_name', 'permission', 'comment'])
      },
      permissions: []
    }
  },
  onLoad (e) {
    const id = e.id
    this.formDataId = id
    this.getDetail(id)
    this.loadPermissions()
  },
  methods: {
    /**
       * 触发表单提交
       */
    submitForm (form) {
      this.$refs.form.submit()
    },

    /**
       * 表单提交
       * @param {Object} event 回调参数 Function(callback:{value,errors})
       */
    submit (event) {
      const {
        value,
        errors
      } = event.detail

      // 表单校验失败页面会提示报错 ，要停止表单提交逻辑
      if (errors) {
        return
      }

      uni.showLoading({
        title: '修改中...',
        mask: true
      })

      // 使用 uni-clientDB 提交数据
      db.collection(dbCollectionName).where({
        _id: this.formDataId
      }).update(value).then((res) => {
        uni.showToast({
          title: '修改成功'
        })
        this.getOpenerEventChannel().emit('refreshData')
        setTimeout(() => uni.navigateBack(), 500)
      }).catch((err) => {
        uni.showModal({
          content: err.message || '请求服务失败',
          showCancel: false
        })
      }).finally(() => {
        uni.hideLoading()
      })
    },

    /**
       * 获取表单数据
       * @param {Object} id
       */
    getDetail (id) {
      uni.showLoading({
        mask: true
      })
      db.collection(dbCollectionName).where({
        _id: id
      }).get().then((res) => {
        const data = res.result.data[0]
        if (data) {
          Object.keys(this.formData).forEach(name => {
            this.binddata(name, data[name])
          })
          this.formData = data
        }
      }).catch((err) => {
        uni.showModal({
          content: err.message || '请求服务失败',
          showCancel: false
        })
      }).finally(() => {
        uni.hideLoading()
      })
    },
    loadPermissions () {
      db.collection('uni-id-permissions').limit(500).get().then(res => {
        this.permissions = res.result.data.map(item => {
          return {
            value: item.permission_id,
            text: item.permission_name
          }
        })
      }).catch(err => {
        uni.showModal({
          title: '提示',
          content: err.message,
          showCancel: false
        })
      })
    }
  }
}
</script>
