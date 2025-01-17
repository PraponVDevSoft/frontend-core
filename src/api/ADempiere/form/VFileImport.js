/**
 * ADempiere-Vue (Frontend) for ADempiere ERP & CRM Smart Business Solution
 * Copyright (C) 2018-Present E.R.P. Consultores y Asociados, C.A. www.erpya.com
 * Contributor(s): Elsio Sanchez elsiosanchez15@outlook.com https://github.com/elsiosanchez
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

import { request } from '@/utils/ADempiere/request'

export function requestListCharsets({
  searchValue,
  pageToken,
  pageSize = 250
}) {
  return request({
    url: '/import-loader/charsets',
    method: 'get',
    params: {
      page_size: pageSize,
      page_token: pageToken,
      //  DSL Query
      search_value: searchValue
    }
  })
}

export function requestListImportTables() {
  return request({
    url: '/import-loader/tables',
    method: 'get'
  })
}

export function requestImportFormatsList({
  tableName
}) {
  return request({
    url: `/import-loader/formats/${tableName}`,
    method: 'get'
  })
}

export function requestGetImportFormat({
  id
}) {
  return request({
    url: `/import-loader/formats/get/${id}`,
    method: 'get'
  })
}

export function requestListImportProcesses({
  tableName
}) {
  return request({
    url: `/import-loader/processes/${tableName}`,
    method: 'get'
  })
}

export function saveRecordImport({
  resourceName,
  charset,
  importFormatId,
  isProcess,
  processId,
  parameters
}) {
  return request({
    url: `/import-loader/imports/${importFormatId}`,
    method: 'post',
    data: {
      charset,
      is_process: isProcess,
      process_id: processId,
      resource_name: resourceName,
      parameters
    }
  })
}

export function requestListFilePreview({
  charset,
  resourceName,
  importFormatId
}) {
  return request({
    url: `/import-loader/imports/resource/preview/${importFormatId}`,
    method: 'get',
    params: {
      charset,
      resource_name: resourceName
    }
  })
}
