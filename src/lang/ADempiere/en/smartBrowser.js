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

const smartBrowser = {
  clearFields: {
    title: 'Clear Query Criteria',
    description: 'Clears the values by setting the default values'
  },
  smartBrowser: 'Smart Browser',
  // dictionary
  dictionaryError: 'Error loading smart browser definition',
  // export
  exportAllRecords: {
    title: 'Export All Records',
    description: 'Records matching the query criteria.',
    successful: 'Successful export',
    quantityExport: 'Quantity of exported records: ',
    withoutExtension: 'You must select the specific format/extension.'
  },
  // process
  processAllRecords: {
    all: ' (ALL)',
    title: 'Process All Records',
    description: 'Process all records matching the query criteria.',
    withoutResults: 'There is no record with the current search criteria.'
  }
}

export default smartBrowser
