const drapDrop = require('drag-drop')
const $ = require('jquery')
const { Observable } = require('rxjs')
const sharp = require('sharp')
const { remote } = require('electron')
const mainProcess = remote.require('./main')

const supportedFileTypes = {
  'image/jpeg': true,
  'image/png': true,
  'image/webp': true,
  'image/tiff': true
}

$(document).ready(function () {
  // Get default settings
  getDefaultSetting()

  drapDrop('#dropzone', {
    onDragOver: function () {
      $('#dropzone').addClass('bg-hover')
    },
    onDragLeave: function () {
      $('#dropzone').removeClass('bg-hover')
    },
    onDrop: function (files) {
      return upload(files)
    }
  })

  $('#fileUploader').on('change', function (event) {
    const { files } = event.target
    const result = []

    let count = 0
    while (count < files.length) {
      result.push(files[count])
      count += 1
    }
    return upload(result)
  })

  $('#download-dir').on('click', function () {
    mainProcess.selectDirectory(function (filePaths) {
      if (filePaths) {
        $('#downloadPath').text(filePaths[0])
      }
    })
  })

  $('#save').on('click', function () {
    saveSetting()
  })
})

function getDefaultSetting () {
  mainProcess.getDefaultSetting(setting => {
    renderInputs(setting)
  })
}

function renderInputs (setting) {
  $('#quality').val(setting.quality)
  $('#width').val(setting.width)
  $('#height').val(setting.height)
  $('#downloadPath').text(setting.downloadPath)
  $('#fit').val(setting.fit)
  $('#format').val(setting.format)
  $('#prefix').val(setting.prefix)
}

function upload (files) {
  const quality = parseInt($('#quality').val()) || 100
  const width = parseInt($('#width').val()) || null
  const height = parseInt($('#height').val()) || null
  const fit = $('#fit option:selected')[0].value
  const format = $('#format option:selected')[0].value
  const outputDir = $('#downloadPath').text()
  const prefix = $('#prefix').val()

  let finishedFile = 0
  let totalFiles = files.length
  let totalFileVisualEffect = totalFiles - 1

  // only show progress bar when there are more than 1 file
  if (totalFiles > 1) {
    showProgressBar(finishedFile, totalFileVisualEffect)
  }

  return Observable
    .from(files)
    .filter(file => supportedFileTypes[file.type])
    .mergeMap(file => {
      const image = sharp(file.path)

      return Observable
        .fromPromise(image.metadata())
        .map(metadata => ({ metadata, file }))
    })
    .mergeMap(({ metadata, file }) => {
      const image = sharp(file.path).resize(width, height)
      const outputOptions = { quality, progressive: true }

      if (fit !== '') {
        image[fit]()
      }

      const filename = file.name
      const output = [outputDir, '/', prefix]
      let nameWithoutExtension = filename.substr(0, filename.lastIndexOf('.'))

      if (format === '') {
        image[metadata.format](outputOptions)
        output.push(filename)
      } else if (format === 'jpeg') {
        image.jpeg(outputOptions)
        output.push(nameWithoutExtension, '.', 'jpg')
      } else {
        image[format](outputOptions)
        output.push(nameWithoutExtension, '.', format)
      }

      return Observable.fromPromise(image.toFile(output.join('')))
    })
    .subscribe({
      next: result => {
        finishedFile += 1
        showProgressBar(finishedFile, totalFileVisualEffect)
        return result
      },
      error: err => {
        console.error(err)
        showNotification(err.message, 'error')
      },
      complete: () => {
        $('#dropzone').removeClass('is-hidden')
        $('#progress').addClass('is-hidden')

        // TODO: save form setting
      }
    })
}

function showNotification (message, status) {
  if (status === 'success') {
    $('.notification').addClass('is-success')
    $('.notification').removeClass('is-danger')
  } else {
    $('.notification').addClass('is-danger')
    $('.notification').removeClass('is-success')
  }

  $('#alert').text(message)
  $('#notification')
    .animate({ 'z-index': 100 })
    .animate({ height: 'toggle' }, 800)
    .animate({ display: 'block' })
    .animate({ height: 'toggle', 'z-index': 0 }, 500)
}

function showProgressBar (start, end) {
  const $progress = $('#progress')
  const $dropzone = $('#dropzone')

  if ($progress.hasClass('is-hidden')) {
    $progress.removeClass('is-hidden')
    $dropzone.addClass('is-hidden')
  }

  $('.progress').attr('value', start)
  $('.progress').attr('max', end)
}

function saveSetting () {
  const data = {
    quality: $('#quality').val(),
    width: $('#width').val(),
    height: $('#height').val(),
    prefix: $('#prefix').val(),
    fit: $('#fit option:selected')[0].value,
    format: $('#format option:selected')[0].value,
    downloadPath: $('#downloadPath').text()
  }

  mainProcess.saveSetting(data, function () {
    showNotification('Setting saved!', 'success')
  })
}
