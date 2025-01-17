/**
 * ADempiere-Vue (Frontend) for ADempiere ERP & CRM Smart Business Solution
 * Copyright (C) 2018-Present E.R.P. Consultores y Asociados, C.A. www.erpya.com
 * Contributor(s): Elsio Sanchez elsiosanchez@gmail.com https://github.com/elsiosanchez
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import Vue from 'vue'

import lang from '@/lang'

// API Request Methods
import {
  requestMailTemplates
} from '@/api/ADempiere/user-interface/component/index.ts'
import { isEmptyValue } from '@/utils/ADempiere'

const initStateMailTemplate = {
  listMail: {
    title: lang.t('issues.emailTemplate'),
    icon: 'v-md-icon-tip',
    menus: []
  }
}

export default {
  state: initStateMailTemplate,

  mutations: {
    setListMailTemplates(state, list) {
      Vue.set(state.listMail, 'menus', list)
    }
  },

  actions: {
    findListMailTemplates({ commit, getters }) {
      const listMailTemplates = getters.getListMailTemplates
      if (isEmptyValue(listMailTemplates)) return
      requestMailTemplates({})
        .then(response => {
          const { records } = response
          const listOptions = records.map(mailTemplate => {
            const { name, subject, mail_text } = mailTemplate

            return {
              name,
              text: subject,
              mail_text,
              action(editor) {
                editor.insert(selected => {
                  const placeholder = mail_text
                  const content = selected || placeholder
                  editor.save()
                  return {
                    text: `${content}`,
                    selected: content
                  }
                })
              }
            }
          })

          commit('setListMailTemplates', listOptions)
        })
        .catch(error => {
          console.warn(`Error getting List Mail: ${error.message}. Code: ${error.code}.`)
        })
    }
  },

  getters: {
    getListMailTemplates(state) {
      return state.listMail
    }
  }
}
