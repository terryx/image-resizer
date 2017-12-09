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
      window.localStorage.setItem('downloadPath', filePaths[0])
    })
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
  $('#prefix').val(setting.prefix)
}

function upload (files) {
  const quality = parseInt($('#quality').val()) || 100
  const width = parseInt($('#width').val()) || null
  const height = parseInt($('#height').val()) || null
  const fit = $('#fit').val()
  const format = $('#format').val()
  const outputDir = $('#downloadPath').text()
  const prefix = $('#prefix').val()

  if (!$('#notification').hasClass('is-hidden')) {
    $('#notification').addClass('is-hidden')
  }

  let finishedFile = 0
  let totalFiles = files.length
  let totalFileVisualEffect = totalFiles - 1

  // only show progress bar when there are more than 1 file
  if (totalFiles > 1) {
    showProgressBar(finishedFile, totalFileVisualEffect)
  }

  return Observable
    .from(files)
    .skipWhile(file => !supportedFileTypes[file.type])
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

      if (format === '') {
        image[metadata.format](outputOptions)
      } else {
        image[format](outputOptions)
      }

      const output = [outputDir, '/', prefix, file.name].join('')

      return Observable.fromPromise(image.toFile(output))
    })
    .subscribe({
      next: result => {
        finishedFile += 1
        showProgressBar(finishedFile, totalFileVisualEffect)
        return result
      },
      error: err => {
        console.error(err)
        $('#notification').removeClass('is-hidden')
        $('#alert').text(err.message)
      },
      complete: () => {
        $('#dropzone').removeClass('is-hidden')
        $('#progress').addClass('is-hidden')

        // TODO: save form setting
      }
    })
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
