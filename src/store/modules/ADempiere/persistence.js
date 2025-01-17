/**
 * ADempiere-Vue (Frontend) for ADempiere ERP & CRM Smart Business Solution
 * Copyright (C) 2018-Present E.R.P. Consultores y Asociados, C.A. www.erpya.com
 * Contributor(s): Yamel Senih ysenih@erpya.com
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

import language from '@/lang'

// Constants
import { LOG_COLUMNS_NAME_LIST, UUID } from '@/utils/ADempiere/constants/systemColumns'
import { ROW_ATTRIBUTES } from '@/utils/ADempiere/tableUtils'
import {
  DISPLAY_COLUMN_PREFIX, IDENTIFIER_COLUMN_SUFFIX, IS_ADVANCED_QUERY
} from '@/utils/ADempiere/dictionaryUtils'
import { BUTTON, IMAGE } from '@/utils/ADempiere/references'

// API Request Methods
import {
  createEntity, updateEntity
} from '@/api/ADempiere/userInterface/entities.ts'

// Utils and Helper Methods
import {
  getTypeOfValue, isEmptyValue, isSameValues
} from '@/utils/ADempiere/valueUtils.js'
import { showMessage } from '@/utils/ADempiere/notification.js'
import { getContextDefaultValue } from '@/utils/ADempiere/contextUtils/contextField'
import { getContextAttributes } from '@/utils/ADempiere/contextUtils/contextAttributes'
import {
  isDateField, isDecimalField, isSupportLookup
} from '@/utils/ADempiere/references'
import { getTableKeyValues } from '@/utils/ADempiere/recordUtil'

const persistence = {
  state: {
    persistence: {}
  },

  mutations: {
    resetStatepersistence(state) {
      state = {
        persistence: {}
      }
    },
    addChangeToPersistenceQueue(state, {
      containerUuid,
      recordUuid,
      columnName,
      oldValue,
      // valueType,
      value
    }) {
      const key = containerUuid + '_' + recordUuid
      const values = {
        columnName,
        // valueType,
        oldValue,
        value
      }

      const currentValues = state.persistence[key]

      if (isEmptyValue(currentValues)) {
        Vue.set(state.persistence, key, {})
      }
      Vue.set(state.persistence[key], columnName, values)

      // if (!isEmptyValue(state.persistence[containerUuid]) && !isEmptyValue(recordUuid)) {
      //   state.persistence[containerUuid][recordUuid] = new Map()
      // } else {
      //   state.persistence[containerUuid] = {
      //     [recordUuid]: new Map()
      //   }
      // }
      // // Set value
      // if (!isEmptyValue(state.persistence[containerUuid]) && !isEmptyValue(recordUuid)) {
      //   state.persistence[containerUuid][recordUuid].set(columnName, {
      //     columnName,
      //     oldValue,
      //     value
      //   })
      // } else {
      //   state.persistence[containerUuid].set([columnName], {
      //     columnName,
      //     // valueType,
      //     oldValue,
      //     value
      //   })
      // }
    },
    // clear old values
    clearPersistenceQueue(state, {
      containerUuid,
      recordUuid
    }) {
      const key = containerUuid + '_' + recordUuid
      Vue.set(state.persistence, key, {})

      // state.persistence[containerUuid] = {
      //   [recordUuid]: new Map()
      // }
    }
  },

  actions: {
    windowActionPerformed({ commit, getters, rootState, dispatch }, {
      field,
      columnName,
      recordUuid,
      value
    }) {
      return new Promise((resolve, reject) => {
        const { parentUuid, containerUuid } = field
        const currentRecord = getters.getTabCurrentRow({
          containerUuid
        })

        // column name to displayedValue
        if (isEmptyValue(columnName)) {
          columnName = field.columnName
        }

        if (isEmptyValue(recordUuid) || recordUuid === 'create-new') {
          recordUuid = getters.getUuidOfContainer(field.containerUuid)
        }

        // TODO: Old value is not working
        let oldValue
        if (!isEmptyValue(currentRecord)) {
          oldValue = currentRecord[columnName]
        }
        if (isEmptyValue(currentRecord) || oldValue === value) {
          const defaultValueGenerated = getContextDefaultValue({
            ...field
          })
          oldValue = defaultValueGenerated
        }

        if (isSupportLookup(field.display_type) || IMAGE.id === field.display_type ||
          (['DocAction', 'Record_ID'].includes(columnName) && BUTTON.id === field.display_type)) {
          let displayedValue
          if (!isEmptyValue(currentRecord)) {
            displayedValue = currentRecord[field.displayColumnName]
          }
          if (isEmptyValue(currentRecord) || oldValue === value) {
            const defaultValueGenerated = getContextDefaultValue({
              ...field,
              columnName: field.displayColumnName
            })
            displayedValue = defaultValueGenerated
          }
          commit('addChangeToPersistenceQueue', {
            containerUuid,
            recordUuid,
            columnName: field.displayColumnName,
            oldValue: displayedValue,
            value: undefined
          })
        }

        commit('addChangeToPersistenceQueue', {
          containerUuid,
          recordUuid,
          columnName,
          oldValue,
          value
        })

        // start callout on server
        if (!containerUuid.endsWith(IS_ADVANCED_QUERY)) {
          dispatch('startCallout', {
            parentUuid,
            containerUuid,
            displayType: field.display_type,
            callout: field.callout,
            columnName,
            value,
            oldValue
          })
        }

        const isAutosave = rootState.settings.autoSave
        if (isAutosave) {
          const emptyFields = getters.getTabFieldsEmptyMandatory({
            parentUuid,
            containerUuid,
            formatReturn: false
          }).filter(itemField => {
            // omit send to server (to create or update) columns manage by backend
            return itemField.is_always_updateable ||
              !LOG_COLUMNS_NAME_LIST.includes(itemField.columnName)
          }).map(itemField => {
            return itemField.name
          })

          if (!isEmptyValue(emptyFields)) {
            showMessage({
              message: language.t('notifications.mandatoryFieldMissing') + emptyFields,
              type: 'info'
            })
            resolve()
            return
          }

          dispatch('flushPersistenceQueue', {
            parentUuid: field.parentUuid,
            containerUuid,
            tableName: field.tabTableName,
            recordUuid
          })
            .then(response => {
              resolve(response)
            })
            .catch(error => reject(error))
        } else {
          resolve()
        }
      })
    },

    flushPersistenceQueue({ commit, dispatch, getters, rootGetters }, {
      parentUuid,
      containerUuid,
      tabId,
      recordId,
      tableName,
      recordUuid,
      attributesList
    }) {
      return new Promise((resolve, reject) => {
        const tabDefinition = rootGetters.getStoredTab(parentUuid, containerUuid)
        const { fieldsList, table } = tabDefinition
        const { key_columns, identifier_columns } = table

        if (isEmptyValue(attributesList)) {
          const persistenceAttributesList = getters.getPersistenceAttributes({
            containerUuid,
            recordUuid
          })
          attributesList = persistenceAttributesList
            .filter(attribute => {
              const { columnName } = attribute

              // omit send to server (to create or update) columns manage by backend
              if (columnName.startsWith(DISPLAY_COLUMN_PREFIX)) {
                return false
              }

              const field = fieldsList.find(fieldItem => fieldItem.columnName === columnName)
              if (!isEmptyValue(field)) {
                if (field.is_always_updateable) {
                  return true
                }
                // prevent `PO.set_Value: Column not updateable`
                // if (!isEmptyValue(recordUuid) && recordUuid !== 'create-new' && !field.is_updateable) {
                //   return false
                // }
                if (LOG_COLUMNS_NAME_LIST.includes(columnName)) {
                  return false
                }
              }

              return true
            })
        }
        if (!isEmptyValue(attributesList)) {
          if (!isEmptyValue(recordUuid) && recordUuid !== 'create-new') {
            // Update existing entity
            // if (key_columns.length > 1) {
            //   recordId = 0
            // }
            const recordAttributes = {}
            attributesList.forEach(attribute => {
              const { columnName, value } = attribute
              let currentValue = value
              if (isEmptyValue(currentValue)) {
                currentValue = null
              }

              const field = fieldsList.find(fieldItem => fieldItem.column_name === columnName)
              if (!isEmptyValue(field)) {
                const { display_type } = field
                if (getTypeOfValue(currentValue) !== 'OBJECT') {
                  if (isDateField(display_type)) {
                    currentValue = {
                      type: 'date',
                      value: currentValue
                    }
                  } else if (isDecimalField(display_type)) {
                    currentValue = {
                      type: 'decimal',
                      value: currentValue
                    }
                  }
                }
              }

              recordAttributes[columnName] = currentValue
            })
            // table multi-keys
            let keyColumns = {}
            if (key_columns.length > 1) {
              keyColumns = getTableKeyValues({
                parentUuid,
                containerUuid,
                keyColumns: key_columns
              })
            }
            return updateEntity({
              recordId,
              tabId,
              recordUuid,
              recordAttributes,
              keyColumns
            })
              .then(response => {
                // TODO: Get list record log
                showMessage({
                  message: language.t('recordManager.updatedRecord'),
                  type: 'success'
                })

                // add new row on table
                commit('setTabRowWithRecord', {
                  containerUuid,
                  recordUuid: response.values[UUID],
                  row: {
                    ...response.values,
                    ...ROW_ATTRIBUTES
                  }
                })

                // update fields values
                dispatch('updateValuesOfContainer', {
                  parentUuid,
                  containerUuid,
                  attributes: response.values
                }, {
                  root: true
                })

                resolve(response)

                // clear old values
                dispatch('clearPersistenceQueue', {
                  containerUuid,
                  recordUuid: response.values[UUID]
                })
              })
              .catch(error => reject(error))
          } else {
            const recordAttributes = {}
            attributesList
              .filter(itemAttribute => {
                return !isEmptyValue(itemAttribute.value)
              })
              .forEach(attribute => {
                const { columnName, value } = attribute
                let currentValue = value

                const field = fieldsList.find(fieldItem => fieldItem.column_name === columnName)
                if (!isEmptyValue(field)) {
                  const { display_type } = field
                  if (getTypeOfValue(currentValue) !== 'OBJECT') {
                    if (isDateField(display_type)) {
                      currentValue = {
                        type: 'date',
                        value
                      }
                    } else if (isDecimalField(display_type)) {
                      currentValue = {
                        type: 'decimal',
                        value
                      }
                    }
                  }
                }
                recordAttributes[columnName] = currentValue
              })

            // Create new entity
            return createEntity({
              tabId,
              recordAttributes
            })
              .then(response => {
                showMessage({
                  message: language.t('data.createRecordSuccessful'),
                  type: 'success'
                })
                response.type = 'createEntity'

                const attributesRecord = response.values || {}

                // add display column to current record
                if (key_columns.length === 1) {
                  let displayedValue = ''
                  const displayedColumnName = DISPLAY_COLUMN_PREFIX + tableName + IDENTIFIER_COLUMN_SUFFIX
                  identifier_columns.forEach(identifier => {
                    const { columnName } = identifier
                    let currentValue = attributesRecord[columnName]
                    // types `decimal` and `date` is a object struct
                    if ((getTypeOfValue(currentValue) === 'OBJECT') && !isEmptyValue(currentValue.type)) {
                      currentValue = currentValue.value
                    }

                    if (isEmptyValue(displayedValue)) {
                      displayedValue = currentValue
                      return
                    }
                    displayedValue += '_' + currentValue
                  })
                  attributesRecord[displayedColumnName] = displayedValue
                }
                response.attributes = attributesRecord

                // add new row on table
                commit('setTabRow', {
                  containerUuid,
                  row: {
                    ...attributesRecord,
                    ...ROW_ATTRIBUTES
                  },
                  rowIndex: 0
                })

                // update fields values
                dispatch('updateValuesOfContainer', {
                  parentUuid,
                  containerUuid,
                  attributes: attributesRecord,
                  isOverWriteParent: tabDefinition.isParentTab
                }, {
                  root: true
                })

                resolve(response)

                // clear old values
                dispatch('clearPersistenceQueue', {
                  // without record uuid to clear new
                  containerUuid
                })

                // update records and logics on child tabs
                tabDefinition.childTabs.filter(tabItem => {
                  const { hasBeenRendered } = rootGetters.getStoredTab(parentUuid, tabItem.uuid)
                  if (hasBeenRendered) {
                    return true
                  }
                  // get loaded tabs with records
                  return rootGetters.getIsLoadedTabRecord({
                    containerUuid: tabItem.uuid
                  })
                }).forEach(tabItem => {
                  const parentValues = getContextAttributes({
                    parentUuid,
                    containerUuid,
                    contextColumnNames: tabItem.context_column_names
                  })
                  dispatch('updateValuesOfContainer', {
                    containerUuid: tabItem.uuid,
                    attributes: parentValues
                  })

                  // if loaded data refresh this data
                  // No set default values the `App Registration` create lines
                  dispatch('getEntities', {
                    parentUuid,
                    containerUuid: tabItem.uuid
                  })
                })
              })
              .catch(error => reject(error))
          }
        }

        resolve()
      })
    },

    setOldPersistenceValues({ commit, dispatch, getters }, {
      parentUuid,
      containerUuid,
      recordUuid
    }) {
      const valuesChanges = getters.getPersistenceAttributesChanges({
        parentUuid,
        containerUuid,
        recordUuid
      })

      valuesChanges.forEach(changes => {
        const { columnName, oldValue } = changes

        commit('updateValueOfField', {
          parentUuid,
          containerUuid,
          columnName,
          recordUuid,
          value: oldValue
        }, {
          root: true
        })
      })

      dispatch('clearPersistenceQueue', {
        containerUuid,
        recordUuid
      })
    },

    // clear old values
    clearPersistenceQueue({ commit }, {
      containerUuid,
      recordUuid
    }) {
      commit('clearPersistenceQueue', {
        containerUuid,
        recordUuid
      })
    }
  },

  getters: {
    getPersistenceAttributes: (state) => ({ containerUuid, recordUuid }) => {
      const key = containerUuid + '_' + recordUuid
      const changes = state.persistence[key]

      if (!isEmptyValue(changes)) {
        const valuesList = Object.values(changes)
        if (isEmptyValue(recordUuid) || recordUuid === 'create-new') {
          return valuesList
        }
        return valuesList
          // only changes
          .filter(attribute => {
            const { value, oldValue } = attribute
            if (value === 0) {
              return true
            }
            return !isSameValues(value, oldValue)
          })
      }
      return []
    },

    /**
     * Evaluate current and old values, if is new compate current values with default values
     * @param {string} parentUuid
     * @param {string} containerUuid
     * @param {string} recordUuid
     * @returns {array}
     */
    getPersistenceAttributesChanges: (state, getters, rootState, rootGetters) => ({
      parentUuid,
      containerUuid,
      recordUuid
    }) => {
      const key = containerUuid + '_' + recordUuid
      const changes = state.persistence[key]
      if (!isEmptyValue(changes)) {
        const valuesList = Object.values(changes)
        if (isEmptyValue(recordUuid) || recordUuid === 'create-new') {
          const defaultRow = rootGetters.getTabParsedDefaultValue({
            parentUuid,
            containerUuid,
            isAddDisplayColumn: true,
            formatToReturn: 'object'
          })
          return valuesList
            // only changes with default value
            .filter(attribute => {
              const { value, columnName } = attribute
              return !isSameValues(value, defaultRow[columnName])
            })
        }
        return valuesList
          // only changes
          .filter(attribute => {
            const { value, oldValue } = attribute
            if (value === 0) {
              return true
            }
            return !isSameValues(value, oldValue)
          })
      }
      return []
    },

    getPersistenceAttributes2: (state) => ({ containerUuid, recordUuid }) => {
      if (
        !isEmptyValue(containerUuid) &&
        !isEmptyValue(recordUuid) &&
        !isEmptyValue(state.persistence[containerUuid]) &&
        !isEmptyValue(state.persistence[containerUuid][recordUuid])
      ) {
        const attributesMap = state.persistence[containerUuid][recordUuid]
        return [
          ...attributesMap.values()
        ]
          .filter(attribute => {
            const { value, oldValue } = attribute
            return !isSameValues(value, oldValue)
          })
      }
      return []
    }
  }
}

export default persistence
