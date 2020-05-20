import React from 'react';
import {
  CollapsibleList,
  MenuItem,
  Classes,
  Boundary,
} from '@blueprintjs/core';
import classNames from 'classnames';
import withBreadcrumbs from 'react-router-breadcrumbs-hoc';
import routes from 'routes/dashboard';
import { useHistory } from 'react-router-dom';

function DashboardBreadcrumbs( {breadcrumbs }){
  const history = useHistory();

  return(
    <CollapsibleList
     className={Classes.BREADCRUMBS}
     dropdownTarget={<span className={Classes.BREADCRUMBS_COLLAPSED} />}
     collapseFrom={Boundary.START}
     visibleItemCount={0}>
     {
      breadcrumbs.map(({ breadcrumb,match })=>{
        return (<MenuItem
          key={match.url}
          icon={'folder-close'}
          text={breadcrumb}
          onClick={() => history.push(match.url) } />)
        })
     }
    </CollapsibleList>
  )
}

export default withBreadcrumbs(routes)(DashboardBreadcrumbs)
