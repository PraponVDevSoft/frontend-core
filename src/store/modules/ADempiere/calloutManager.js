/**
 * ADempiere-Vue (Frontend) for ADempiere ERP & CRM Smart Business Solution
 * Copyright (C) 2018-Present E.R.P. Consultores y Asociados, C.A. www.erpya.com
 * Contributor(s): Edwin Betancourt EdwinBetanc0urt@outlook.com https://github.com/EdwinBetanc0urt
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

import lang from '@/lang'

// API Request Methods
import { runCallOutRequest } from '@/api/ADempiere/userInterface/window.ts'

// Constants
import { ROW_ATTRIBUTES } from '@/utils/ADempiere/tableUtils'
import {
  DISPLAY_COLUMN_PREFIX, UNIVERSALLY_UNIQUE_IDENTIFIER_COLUMN_SUFFIX
} from '@/utils/ADempiere/dictionaryUtils'

// Utils and Helper Methods
import { getTypeOfValue, isEmptyValue, isSameValues } from '@/utils/ADempiere/valueUtils'
import { showMessage } from '@/utils/ADempiere/notification'
import { convertObjectToKeyValue } from '@/utils/ADempiere/formatValue/iterableFormat'
import { isDateField, isDecimalField } from '@/utils/ADempiere/references'

const calloutManager = {
  actions: {
    startCallout({ commit, dispatch, rootGetters }, {
      parentUuid,
      containerUuid,
      displayType,
      callout,
      tableName,
      columnName,
      value,
      oldValue
    }) {
      return new Promise((resolve, reject) => {
        // validate callout
        if (isEmptyValue(callout)) {
          resolve({})
          return
        }

        const {
          id, fieldsList, isParentTab, firstTabUuid
        } = rootGetters.getStoredTab(parentUuid, containerUuid)
        let fieldsListParent = []
        if (!isParentTab && !isEmptyValue(firstTabUuid)) {
          fieldsListParent = rootGetters.getStoredFieldsFromTab(parentUuid, firstTabUuid)
        }

        // const window = rootGetters.getStoredWindow(parentUuid)
        const contextAttributes = {}
        rootGetters.getValuesView({
          parentUuid,
          containerUuid
        }).filter(attribute => {
          const { columnName } = attribute
          return !isEmptyValue(attribute.value) &&
            !columnName.startsWith(DISPLAY_COLUMN_PREFIX) &&
            !columnName.endsWith(UNIVERSALLY_UNIQUE_IDENTIFIER_COLUMN_SUFFIX) &&
            !Object.prototype.hasOwnProperty.call(ROW_ATTRIBUTES, columnName)
        }).forEach(attribute => {
          const { columnName, value } = attribute
          let currentValue = value
          if (isEmptyValue(currentValue)) {
            currentValue = null
          }

          const field = fieldsList.find(fieldItem => fieldItem.column_name === columnName)
          let currentDisplayType = null
          if (!isEmptyValue(field)) {
            currentDisplayType = field.display_type
          } else {
            // find on parent tab (first tab)
            const parentField = fieldsListParent.find(fieldItem => {
              return fieldItem.column_name === columnName
            })
            if (!isEmptyValue(parentField)) {
              currentDisplayType = parentField.display_type
            }
          }

          if (getTypeOfValue(currentValue) !== 'OBJECT') {
            if (isDateField(currentDisplayType)) {
              currentValue = {
                type: 'date',
                value: currentValue
              }
            } else if (isDecimalField(currentDisplayType)) {
              currentValue = {
                type: 'decimal',
                value: currentValue
              }
            }
          }
          contextAttributes[columnName] = currentValue
        })

        if (getTypeOfValue(value) !== 'OBJECT') {
          if (isDateField(displayType)) {
            value = {
              type: 'date',
              value
            }
          } else if (isDecimalField(displayType)) {
            value = {
              type: 'decimal',
              value
            }
          }
        }

        runCallOutRequest({
          // windowNo: window.windowIndex,
          tabId: id,
          callout,
          tableName,
          columnName,
          value,
          oldValue,
          contextAttributes
        })
          .then(calloutResponse => {
            const { values } = calloutResponse

            resolve(values)

            const attributesList = convertObjectToKeyValue({
              object: values
            })

            const recordUuid = rootGetters.getUuidOfContainer(containerUuid)
            attributesList.forEach(attribute => {
              const { value: attributeValue, columnName: attributeColumnName } = attribute

              const attributeOldValue = rootGetters.getValueOfFieldOnContainer({
                parentUuid,
                containerUuid,
                columnName: attributeColumnName
              })

              // add changes to send
              if (!isSameValues(attributeValue, attributeOldValue)) {
                const field = fieldsList.find(fieldItem => fieldItem.column_name === attributeColumnName)
                if (!isEmptyValue(field)) {
                  commit('addChangeToPersistenceQueue', {
                    containerUuid,
                    recordUuid,
                    columnName: attributeColumnName,
                    oldValue: attributeOldValue,
                    value: attributeValue
                  })
                }
              }
            })

            dispatch('updateValuesOfContainer', {
              parentUuid,
              containerUuid,
              attributes: attributesList,
              isOverWriteParent: isParentTab
            })

            // set values on table
            const rowIndex = rootGetters.getTabRowIndex({
              containerUuid,
              recordUuid
            })
            const currentRow = rootGetters.getTabRowData({
              containerUuid,
              recordUuid
            })
            commit('setTabRow', {
              containerUuid,
              recordUuid,
              rowIndex,
              row: {
                ...ROW_ATTRIBUTES,
                ...currentRow,
                ...values
              }
            })
          })
          .catch(error => {
            reject(error)
            showMessage({
              message: error.message || lang.t('window.callout.error'),
              type: 'error'
            })
            console.warn(`Field ${columnName} error callout. Code ${error.code}: ${error.message}`)
          })
      })
    }
  }
}

export default calloutManager
