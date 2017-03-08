import {createSlice} from 'nectarine';

const sessionSlice = createSlice({
  schema: (_) => {
    return {
      selectedGuest: {
        picture: _({type: 'string'}),
        firstName: _({type: 'string'}),
        name: _({type: 'string'}),
        hometown: _({type: 'string'}),
        drink_pref: _({type: 'string'}),
        visitCount: _({type: 'number'})
      },
      database: _
    };
  },

  actions: {
    setSelectedGuest: function(guest) {
      this.slice.selectedGuest.$set(guest);
    },
    getDatabase: function() {
      return this.slice.database.$get();
    }
  }
})

export default sessionSlice
