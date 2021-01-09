import React from 'react';
import { render } from 'react-dom';
import { Router,Switch, Route} from 'react-router-dom';
import history from './history';
import App from './components/App';
import './index.css';
import Blocks from './components/Blocks';
import TransactionPool from './components/TransactionPool';
import ConductTransaction from './components/ConductTransaction';

render(
    <Router history={history}>
        <Switch>
            <Route exact path='/' component={App} />
            <Route path='/blocks' component={Blocks} />
            <Route path='/conduct-transction' component={ConductTransaction} />
            <Route path='/transaction-pool' component={TransactionPool} />
        </Switch>
        </Router>,
    document.getElementById('root')
);


