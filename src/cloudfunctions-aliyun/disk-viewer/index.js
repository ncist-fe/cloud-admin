'use strict';
exports.main = async (event, context) => {
	//event为客户端上传的参数
	const bodyObj = JSON.parse(event.body)
  const parent = bodyObj.parent
  console.log('query file in parent:', parent)
	const filesInfo = await uniCloud.database().collection('opendb-netdisk-files').where({
    parent: parent
  }).get()
	//返回数据给客户端
	return filesInfo
};
