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

import store from '@/store'

// Utils and Helper Methods
import { getTypeOfValue, isEmptyValue } from '@/utils/ADempiere/valueUtils'

export default {
  name: 'MixinField',

  props: {
    parentUuid: {
      type: [String, Number],
      default: undefined
    },
    containerUuid: {
      type: [String, Number],
      required: true
    },
    containerManager: {
      type: Object,
      required: true
    },
    metadata: {
      type: Object,
      required: true
    }
  },

  computed: {
    autoSave() {
      return store.state.settings.autoSave
    },
    isMobile() {
      return store.state.app.device === 'mobile'
    },
    isDisabled() {
      return Boolean(this.metadata.readonly || this.metadata.disabled)
    },
    /**
     * Commons properties in components fields
     */
    commonsProperties() {
      return {
        class: this.cssClassStyle,
        disabled: this.isDisabled,
        placeholder: this.metadata.placeholder,
        readonly: Boolean(this.metadata.readonly),
        ref: this.metadata.column_name
      }
    },
    cssClassCustomField() {
      return ' '
    },
    cssClassStyle() {
      let styleClass = this.cssClassCustomField
      if (this.isEmptyRequired) {
        styleClass += ' field-empty-required'
      }

      if (this.inTable) {
        styleClass += ' field-in-table'
      }

      if (!isEmptyValue(this.metadata.cssClassName)) {
        styleClass += ' ' + this.metadata.cssClassName
      }

      // return {
      //   [this.cssClassCustomField]: !isEmptyValue(this.cssClassCustomField)
      //   'field-empty-required': isEmptyRequired.value,
      //   [fieldMetadata.cssClassName]: fieldMetadata.cssClassName
      // }
      return styleClass
    },
    isEmptyRequired() {
      return isEmptyValue(this.value) && this.metadata.required
    },
    storedDefaultValue() {
      return store.getters.getStoredDefaultValue({
        parentUuid: this.metadata.parentUuid,
        containerUuid: this.metadata.containerUuid,
        contextColumnNames: this.metadata.contextColumnNames,
        //
        uuid: this.metadata.uuid,
        id: this.metadata.internal_id,
        defaultValue: this.metadata.default_value,
        value: this.value
      })
    },
    value: {
      get() {
        const { column_name, containerUuid, inTable } = this.metadata
        // table records values
        if (inTable) {
          const value = this.containerManager.getCell({
            containerUuid,
            rowIndex: this.metadata.rowIndex,
            rowUid: this.metadata.rowUid,
            columnName: column_name
          })
          // types `decimal` and `date` is a object struct
          if ((getTypeOfValue(value) === 'OBJECT') && !isEmptyValue(value.type)) {
            return value.value
          }
          return value
        } else {
          const value = store.getters.getValueOfFieldOnContainer({
            parentUuid: this.metadata.parentUuid,
            containerUuid,
            columnName: column_name
          })
          // types `decimal` and `date` is a object struct
          if ((getTypeOfValue(value) === 'OBJECT') && !isEmptyValue(value.type)) {
            return value.value
          }
          return value
        }
      },
      set(newValue) {
        const { column_name, containerUuid, inTable } = this.metadata

        // table records values
        if (inTable) {
          this.containerManager.setCell({
            containerUuid,
            rowIndex: this.metadata.rowIndex,
            rowUid: this.metadata.rowUid,
            columnName: column_name,
            value: newValue
          })
        }
        store.commit('updateValueOfField', {
          parentUuid: this.metadata.parentUuid,
          containerUuid,
          columnName: column_name,
          value: newValue
        })
        // update element column name
        if (!this.metadata.isSameColumnElement) {
          store.commit('updateValueOfField', {
            parentUuid: this.metadata.parentUuid,
            containerUuid,
            columnName: this.metadata.element_name,
            value: newValue
          })
        }
      }
    },
    currentTab() {
      if (isEmptyValue(this.metadata.parentUuid) || !this.containerManager.getPanel) {
        return {}
      }
      return this.containerManager.getPanel({
        parentUuid: this.metadata.parentUuid,
        containerUuid: this.metadata.containerUuid
      })
    },
    currentRecord() {
      return store.getters.getTabCurrentRow({
        containerUuid: this.metadata.containerUuid
      })
    },
    currentFieldList() {
      return store.getters.getCurrentFieldList
    }
  },

  watch: {
    currentFieldList(value) {
      const tabPanel = store.getters.getContainerInfo
      const fieldFocusColumnName = store.getters.getFieldFocusColumnName
      if (
        !isEmptyValue(fieldFocusColumnName) &&
        !isEmptyValue(tabPanel) &&
        fieldFocusColumnName &&
        this.metadata.column_name === fieldFocusColumnName &&
        tabPanel.currentTab.containerUuid === this.metadata.containerUuid &&
        !isEmptyValue(this.$refs) &&
        !isEmptyValue(this.$refs[fieldFocusColumnName]) &&
        tabPanel.id === this.currentTab.id
      ) {
        this.$refs[fieldFocusColumnName].focus()
      }
      // this.$refs[fieldFocusColumnName].focus()
    }
  },

  created() {
    if (this.metadata.isGetServerValue && isEmptyValue(this.value)) {
      this.setDefaultValue()

      // change depends fields
      // this.preHandleChange(value)
      this.activeLogics()
    }
  },

  mounted() {
    const tabPanel = store.getters.getContainerInfo
    if (
      this.metadata.handleRequestFocus &&
      !isEmptyValue(tabPanel) &&
      !isEmptyValue(tabPanel.currentTab) &&
      tabPanel.id === this.currentTab.id
    ) {
      this.requestFocus()
    }
  },

  methods: {
    /**
     * Parse the value to a new value if required for element-ui component
     * compatibility where this method is overwritten
     * @param {mixed} value
     */
    parseValue(value) {
      return value
    },

    /**
     * Get default value from server
     * @returns promisse with object = { value, default_value, uuid, id }
     */
    loadDefaultValueFromServer() {
      if (this.containerManager && this.containerManager.getDefaultValue) {
        return this.containerManager.getDefaultValue({
          parentUuid: this.metadata.parentUuid,
          containerUuid: this.metadata.containerUuid,
          contextColumnNames: this.metadata.contextColumnNames,
          defaultValue: this.metadata.default_value,
          //
          inTable: this.metadata.inTable,
          rowIndex: this.metadata.rowIndex,
          rowUid: this.metadata.rowUid,
          //
          uuid: this.metadata.uuid,
          id: this.metadata.internal_id,
          columnName: this.metadata.column_name,
          value: this.value
        })
      }

      // return default parsed value
      return Promise.resolve({
        value: this.parseValue(this.value),
        displayedValue: undefined
      })
    },

    async setDefaultValue() {
      let value
      let displayedValue
      const storedValues = this.storedDefaultValue

      if (!isEmptyValue(storedValues)) {
        // get from server
        const {
          value: valueOfStore,
          displayedValue: displayedValueOfStore
        } = storedValues

        value = valueOfStore
        displayedValue = displayedValueOfStore
      } else {
        // get from server
        const {
          value: valueOfServer,
          displayedValue: displayedValueOfServer
        } = await this.loadDefaultValueFromServer()

        value = valueOfServer
        displayedValue = displayedValueOfServer
      }

      // set value into component and fieldValue store
      this.displayedValue = displayedValue
      this.value = this.parseValue(value)
    },

    /**
     * Set focus if handle focus attribute is true
     */
    requestFocus() {
      if (this.$refs[this.metadata.column_name]) {
        this.$refs[this.metadata.column_name].focus()
      }
    },
    /**
     * Overwrite component method if necessary
     * validate values before send values to store or server
     * @param {mixed} value
     */
    preHandleChange(value) {
      this.handleFieldChange({ value })
    },
    focusGained(value) {
      // const info = {
      //   columnName: this.metadata.column_name
      // }
      // store.dispatch('fieldListInfo', { info })
      store.commit('setFieldFocusColumnName', this.metadata.column_name)

      if (this.metadata.handleContentSelection) {
        // select all the content inside the text box
        if (!isEmptyValue(value.target.selectionStart) &&
          !isEmptyValue(value.target.selectionStart)) {
          value.target.selectionStart = 0
          value.target.selectionEnd = value.target.value.length
        }
      }
      if (this.metadata.handleFocusGained) {
        store.dispatch('notifyFocusGained', {
          containerUuid: this.metadata.containerUuid,
          columnName: this.metadata.column_name,
          value: this.value
        })
      }
      this.setContainerInformation()
    },
    focusLost(value) {
      store.commit('setFieldFocusColumnName', this.metadata.column_name)
      if (this.metadata.handleFocusLost) {
        store.dispatch('notifyFocusLost', {
          containerUuid: this.metadata.containerUuid,
          columnName: this.metadata.column_name,
          value: this.value
        })
      }
    },
    keyPressed(value) {
      if (this.metadata.handleKeyPressed) {
        store.dispatch('notifyKeyPressed', {
          containerUuid: this.metadata.containerUuid,
          columnName: this.metadata.column_name,
          value: value.key,
          keyCode: value.keyCode
        })
      }
    },
    /**
     * Keyup enter event on DOM element, call this method
     * @param {object} event html
     */
    actionKeyPerformed(event) {
      if (this.metadata.handleActionKeyPerformed) {
        store.dispatch('notifyActionKeyPerformed', {
          containerUuid: this.metadata.containerUuid,
          columnName: this.metadata.column_name,
          value: event.target.value,
          keyCode: event.keyCode
        })
      }
      // enter key sends the values
      // this.preHandleChange(event.target.value)
    },
    keyReleased(value) {
      if (this.metadata.handleKeyReleased) {
        store.dispatch('notifyKeyReleased', {
          containerUuid: this.metadata.containerUuid,
          columnName: this.metadata.column_name,
          value: value.key,
          keyCode: value.keyCode
        })
      }
    },

    /**
     * Active or calling change logics on depends fields
     */
    activeLogics() {
      let fieldsList = []
      if (this.containerManager.getFieldsList) {
        fieldsList = this.containerManager.getFieldsList({
          parentUuid: this.metadata.parentUuid,
          containerUuid: this.metadata.containerUuid,
          root: this
        })
      }

      store.dispatch('changeDependentFieldsList', {
        field: this.metadata,
        fieldsList,
        containerManager: this.containerManager
      })
    },

    /**
     * @param {mixed} value, main value in component
     * @param {mixed} valueTo, used in end value in range
     * @param {string} displayedValue, or displayColumnName to show in select
     */
    handleFieldChange({
      value,
      valueTo,
      displayedValue
    }) {
      // Global Action performed
      const info = {
        columnName: this.metadata.column_name
      }
      store.dispatch('fieldListInfo', { info })
      this.setContainerInformation()
      store.commit('setFieldFocusColumnName', this.metadata.column_name)

      if (this.metadata.handleActionPerformed && this.autoSave) {
        store.dispatch('notifyActionPerformed', {
          containerUuid: this.metadata.containerUuid,
          columnName: this.metadata.column_name,
          value
        })
        if (!this.metadata.isSameColumnElement) {
          store.dispatch('notifyActionPerformed', {
            containerUuid: this.metadata.containerUuid,
            columnName: this.metadata.element_name,
            value
          })
        }
      }

      // if is custom field, set custom handle change value
      if (this.metadata.isCustomField) {
        if (this.metadata.isActiveLogics) {
          this.activeLogics()
        }
        return
      }

      if (this.metadata.isAdvancedQuery) {
        return
      }

      store.dispatch('notifyFieldChange', {
        containerUuid: this.metadata.containerUuid,
        containerManager: this.containerManager,
        field: this.metadata,
        columnName: this.metadata.column_name,
        newValue: value
      })
    },

    handleClearValue() {
      this.value = undefined
    },

    setContainerInformation() {
      if (!isEmptyValue(this.currentTab)) {
        store.dispatch('panelInfo', {
          currentTab: this.currentTab,
          currentRecord: this.currentRecord
        })
      }
    }
  }
}
