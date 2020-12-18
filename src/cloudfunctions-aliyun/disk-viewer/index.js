'use strict';
exports.main = async (event, context) => {
	//event为客户端上传的参数
	const bodyObj = JSON.parse(event.body)
  const parent = bodyObj.parent
  const pathArray = parent.split('/')
  console.log('query file in parent:', pathArray)
  const pathStack = []
  let parentId = null
  for (const folder of pathArray) {
    const whereClause = {
      name: folder,
      parent: parentId
    }
    const resp = await uniCloud.database().collection('opendb-netdisk-files').where(whereClause).orderBy("isFolder", "desc").orderBy("createOn","desc").get()
    const folderInfo = resp.data
    if (folderInfo.length > 0) {
      parentId = folderInfo[0]._id
      pathStack.push({
        name: folder,
        id: parentId,
        isFolder: folderInfo[0].isFolder
      })
    } else {
      console.error('path not exist when query folder:', folder)
      return {
        code: '-1',
        message: '路径不存在'
      }
    }
  }
  const lastPath = pathStack.slice(-1).pop()
  let files = []
  if (lastPath.isFolder) {
    const whereClause = {
      parent: lastPath.id
    }
    const resp = await uniCloud.database().collection('opendb-netdisk-files').where(whereClause).orderBy("isFolder", "desc").orderBy("createOn","desc").get()
    files = resp.data
  }
	//返回数据给客户端
	return {
    code: 0,
    data: {
      paths: pathStack,
      files: files
    }
  }
};


