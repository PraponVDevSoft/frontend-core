// ADempiere-Vue (Frontend) for ADempiere ERP & CRM Smart Business Solution
// Copyright (C) 2017-Present E.R.P. Consultores y Asociados, C.A.
// Contributor(s): Yamel Senih ysenih@erpya.com www.erpya.com
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { Message, Notification } from 'element-ui'
import language from '@/lang'
import router from '@/router'

export function hasTranslation(text) {
  const hasKey = language.te('notifications.' + text)
  if (hasKey) {
    const translatedText = language.t('notifications.' + text)
    return translatedText
  }
  return text
}

/**
 *
 * @param {string} type, required
 * @param {string} title, required
 * @param {object} message
 * @param {string} summary
 * @param {string} name
 * @param {array} logs
 */
export function showNotification({ type = 'success', title, message = '', summary, name, logs = [], isRedirect = true }) {
  title = hasTranslation(title)
  if (message) {
    message = hasTranslation(message)
  }
  // For summary
  if (summary) {
    if (message) {
      message = `${message} <br> ${summary}`
    } else {
      message = summary
    }
  }
  // For logs
  if (logs && logs.length) {
    logs.forEach(logResult => {
      if (logResult) {
        message = `${message} <br> ${logResult.log}`
      }
    })
  }
  if (name) {
    message = `${name} ${message}`
  }

  return Notification({
    title,
    message: `
      <div style="max-height: 100px;max-width: 250px; overflow-y: auto;">
        ${message}
      </div>
    `,
    type,
    position: 'bottom-right',
    dangerouslyUseHTMLString: true,
    onClick() {
      if (isRedirect) {
        router.push({
          name: 'ProcessActivity'
        }, () => {})
      }
    }
  })
}
export function showNotificationReport({ type = 'success', title, message, link, openLink }) {
  title = hasTranslation(title)
  if (message) {
    message = hasTranslation(message)
  }
  openLink = hasTranslation(openLink)
  return Notification({
    title,
    message: `
      <div style="max-height: 100px;max-width: 250px; overflow-y: auto; text-align: center;">
        ${message}
        <br><br>
        <a href="${link}" target="_blank" class="notification-link">
          <i class="el-icon-link" style="margin-right: 5px; font-size: 16px; vertical-align: middle;"></i>
          <span style="font-weight: bold; font-size: 14px;">${openLink}</span>
        </a>
      </div>
    `,
    type,
    position: 'bottom-right',
    dangerouslyUseHTMLString: true
  })
}
/**
 *
 * @param {string} type
 * @param {string} message
 * @param {number} duration
 */
export function showMessage({ type = 'success', message, duration = 0 }) {
  let delay = 3000
  if (type === 'info') {
    delay = 2000
  }
  if (duration) {
    delay = duration
  }

  if (type === 'warn') {
    console.warn(message)
  } else if (type === 'error') {
    console.error(message)
  }
  return Message({
    message,
    type,
    showClose: true,
    duration: delay
  })
}
