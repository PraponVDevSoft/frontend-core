/**
 * ADempiere-Vue (Frontend) for ADempiere ERP & CRM Smart Business Solution
 * Copyright (C) 2017-Present E.R.P. Consultores y Asociados, C.A. www.erpya.com
 * Contributor(s): Edwin Betancourt EdwinBetanc0urt@outlook.com https://github.com/EdwinBetanc0urt
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { isEmptyValue } from '@/utils/ADempiere/valueUtils'

export function generateTransitions(nodesList) {
  const transitionsList = []

  nodesList.forEach(element => {
    const uuid = element.uuid
    const id = element.value

    if (!isEmptyValue(element.transitions)) {
      element.transitions.forEach((nextNode, key) => {
        if (!isEmptyValue(nextNode.node_next_uuid)) {
          transitionsList.push({
            id: id + key,
            label: nextNode.description,
            target: nextNode.node_next_uuid,
            source: uuid
          })
        }
      })
    }
  })
  const blon = nodesList.map(item => {
    return {
      uuid: item.uuid
    }
  })

  const workflowTranstitionsList = transitionsList.filter(data => {
    const isExists = blon.find(mode => mode.uuid === data.source)
    if (!isEmptyValue(isExists)) {
      return data
    }
  })

  return workflowTranstitionsList
}

export function generateStates(nodesList) {
  // TODO: Verify it filter or replace with id
  // nodesList = nodesList.filter(node => !isEmptyValue(node.uuid))
  let statesList = []

  if (!isEmptyValue(nodesList)) {
    statesList = nodesList.map((node, key) => {
      return {
        id: node.uuid,
        label: node.name,
        key,
        description: node.description,
        help: node.help
      }
    })
  }

  return statesList
}

export function generateWorkflowDiagram(workflowDefinition) {
  const stateSemanticsList = []
  if (!isEmptyValue(workflowDefinition.start_node)) {
    stateSemanticsList.push({
      classname: 'start-node',
      id: workflowDefinition.start_node.uuid
    })
  }

  const transitionsList = generateTransitions(workflowDefinition.workflow_nodes)

  const statesList = generateStates(workflowDefinition.workflow_nodes)

  return {
    stateSemanticsList,
    transitionsList,
    statesList // as node list
  }
}