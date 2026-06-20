package com.chordflow.client

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : TauriActivity() {
  private var pendingAudioRequest: PermissionRequest? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)

    webView.webChromeClient = object : WebChromeClient() {
      override fun onPermissionRequest(request: PermissionRequest) {
        val audioResources = request.resources.filter { it == PermissionRequest.RESOURCE_AUDIO_CAPTURE }.toTypedArray()
        if (audioResources.isEmpty()) {
          request.deny()
          return
        }

        runOnUiThread {
          if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            request.grant(audioResources)
          } else {
            pendingAudioRequest = request
            ActivityCompat.requestPermissions(
              this@MainActivity,
              arrayOf(Manifest.permission.RECORD_AUDIO),
              AUDIO_PERMISSION_REQUEST_CODE,
            )
          }
        }
      }

      override fun onPermissionRequestCanceled(request: PermissionRequest) {
        if (pendingAudioRequest == request) {
          pendingAudioRequest = null
        }
      }
    }
  }

  override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    if (requestCode != AUDIO_PERMISSION_REQUEST_CODE) return

    val request = pendingAudioRequest ?: return
    pendingAudioRequest = null
    if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) {
      request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
    } else {
      request.deny()
    }
  }

  companion object {
    private const val AUDIO_PERMISSION_REQUEST_CODE = 4107
  }
}
