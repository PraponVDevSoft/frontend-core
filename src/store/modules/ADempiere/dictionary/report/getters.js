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

// Constants
import { FIELDS_DATE, FIELDS_DECIMALS } from '@/utils/ADempiere/references.js'
import { COLUMNNAME_Record_ID } from '@/utils/ADempiere/constants/systemColumns'

// Utils and Helper Methods
import { isEmptyValue } from '@/utils/ADempiere/valueUtils.js'
import { isDisplayedField, isMandatoryField } from '@/utils/ADempiere/dictionary/process.js'

/**
 * Dictionary Report Getters
 */
export default {
  getStoredReport: (state) => (reportId) => {
    return state.storedReports[reportId]
  },

  getStoredFieldsFromReport: (state, getters) => (reportId) => {
    const report = getters.getStoredReport(reportId)
    if (!isEmptyValue(report)) {
      return report.fieldsList
    }
    return undefined
  },

  getStoredReportExportTypes: (state, getters) => (reportId) => {
    const report = getters.getStoredReport(reportId)
    if (!isEmptyValue(report)) {
      return report.reportExportTypes
    }
    return []
  },

  /**
   * Determinate if panel is ready to send, all fields mandatory and displayed with values
   * @param {string}  containerUuid
   * @param {object}  row, data to compare if is table
   * @returns {object}
   */
  getReportParametersEmptyMandatory: (state, getters, rootState, rootGetters) => ({
    containerUuid: reportId,
    fieldsList,
    formatReturn = 'name'
  }) => {
    const reportDefinition = rootGetters.getStoredReport(reportId)
    if (isEmptyValue(fieldsList)) {
      fieldsList = reportDefinition.fieldsList // getters.getStoredFieldsFromReport(containerUuid)
    }

    const fieldsEmpty = fieldsList.filter(fieldItem => {
      if (fieldItem.is_info_only) {
        return false
      }
      const isMandatory = isMandatoryField(fieldItem)
      const isDisplayed = isDisplayedField(fieldItem)

      if (!(isDisplayed && isMandatory)) {
        return false
      }

      const value = rootGetters.getValueOfField({
        containerUuid: reportDefinition.uuid,
        columnName: fieldItem.columnName
      })

      if (!isEmptyValue(value)) {
        return false
      }

      // displayed or madatory and empty
      return true
    })

    if (formatReturn) {
      return fieldsEmpty.map(fieldItem => {
        // fieldItem.name by default
        return fieldItem[formatReturn]
      })
    }

    return fieldsEmpty
  },

  /**
   * Getter converter params with value format
   * @param {String} containerUuid
   * @param {Array<Object>} fieldsList
   * @returns {Array<Object>} [{ columnName: name key, value: value to send }]
   */
  getReportParameters: (state, getters, rootState, rootGetters) => ({
    containerUuid: reportId,
    fieldsList = []
  }) => {
    const reportDefinition = rootGetters.getStoredReport(reportId)
    if (isEmptyValue(fieldsList)) {
      fieldsList = reportDefinition.fieldsList // getters.getStoredFieldsFromReport(containerUuid)
    }
    const { uuid } = reportDefinition

    const reportParameters = {}

    fieldsList.forEach(fieldItem => {
      const {
        is_info_only, columnName, display_type, is_range, columnNameTo, isGeneratedRange
      } = fieldItem
      if (is_info_only) {
        return false
      }
      const isMandatory = isMandatoryField(fieldItem)
      if (!isMandatory) {
        // evaluate displayed fields
        if (!fieldItem.isShowedFromUser) {
          return
        }
      }

      const value = rootGetters.getValueOfField({
        containerUuid: uuid,
        columnName
      })

      const isDateField = FIELDS_DATE.includes(display_type)
      const isDecimalField = FIELDS_DECIMALS.includes(display_type)

      if (is_range && !isGeneratedRange) {
        const valueTo = rootGetters.getValueOfField({
          containerUuid: uuid,
          columnName: columnNameTo
        })
        if (!isEmptyValue(valueTo)) {
          reportParameters[columnNameTo] = valueTo
          if (isDateField) {
            reportParameters[columnNameTo] = {
              type: 'date',
              value: valueTo
            }
          } else if (isDecimalField) {
            reportParameters[columnNameTo] = {
              type: 'decimal',
              value: valueTo
            }
          }
        }
      }

      if (!isEmptyValue(value)) {
        // reportParameters.push({
        //   columnName,
        //   value
        // })
        reportParameters[columnName] = value
        if (isDateField) {
          reportParameters[columnName] = {
            type: 'date',
            value: value
          }
        } else if (isDecimalField && ![COLUMNNAME_Record_ID].includes(columnName)) {
          reportParameters[columnName] = {
            type: 'decimal',
            value: value
          }
        }
      }
    })

    return reportParameters
  },

  /**
   * Available fields to showed/hidden
   * to show, used in components FilterFields
   * @param {string} containerUuid
   * @param {array} fieldsList
   * @param {function} showedMethod
   * @param {boolean} isEvaluateShowed
   * @param {boolean} isEvaluateDefaultValue
   */
  getReportParametersListToHidden: (state, getters) => ({
    containerUuid,
    isTable = false,
    fieldsList = [],
    showedMethod = isDisplayedField,
    isEvaluateDefaultValue = false,
    isEvaluateShowed = true
  }) => {
    if (isEmptyValue(fieldsList)) {
      fieldsList = getters.getStoredFieldsFromReport(containerUuid)
      if (isEmptyValue(fieldsList)) {
        return []
      }
    }

    // all optionals (not mandatory) fields
    return fieldsList
      .filter(fieldItem => {
        const { default_value } = fieldItem

        if (fieldItem.isMandatory && !isTable) {
          return false
        }

        if (isEvaluateDefaultValue && isEvaluateShowed) {
          return showedMethod(fieldItem) &&
            !isEmptyValue(default_value)
        }

        if (isEvaluateDefaultValue) {
          return !isEmptyValue(default_value)
        }

        if (isEvaluateShowed) {
          return showedMethod(fieldItem)
        }

        return true
      })
  }

}
