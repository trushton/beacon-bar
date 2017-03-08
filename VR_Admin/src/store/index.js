import {createStore} from 'nectarine';
import sessionSlice from './session';

const store = createStore({sessionSlice});

export default store;
