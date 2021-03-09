<template>
    <div>
      wallet page test 2..
      <br/>
      <div class="">{{ wallet }}</div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
//import { Wallet } from '@/scripts/wallet/wallet';
import parseAcct from '../../../misc/acct/parse';
import Progress from '@/scripts/loading';
//import XPreview from './preview.vue';
//const storeItems = require('@/scripts/room/furnitures.json5');
import { faBoxOpen, faUndo, faArrowsAlt, faBan, faBroom } from '@fortawesome/free-solid-svg-icons';
import { faSave, faTrashAlt } from '@fortawesome/free-regular-svg-icons';
import { query as urlQuery } from '../../../prelude/url';
import MkButton from '@/components/ui/button.vue';
import MkSelect from '@/components/ui/select.vue';
import { selectFile } from '@/scripts/select-file';
import { acct as getAcct } from '../../filters/user';
import * as os from '@/os';
//import { ColdDeviceStorage } from '@/store';

//let wallet: Wallet;

export default defineComponent({
  components: {
  },

  props: {
    acct: {
      type: String,
      required: true
    },
  },

  data() {
    return {
      wallet: null
    };
  },

  created() {
    this.fetch();
  },

  methods: {
    getAcct,

    fetch() {
      if (this.acct == null) return;
      console.log(this.acct);
      Progress.start();
      os.api('wallet/show', parseAcct(this.acct)).then(wallet => {
        console.log(wallet);
        this.wallet = wallet;
      }).catch(e => {
        this.error = e;
      }).finally(() => {
        Progress.done();
      });
    },

  }

});
</script>

<style lang="scss" scoped>

</style>
