<template>
    <div style="text-align: center;">
			<div style="font-size: 1.15em;">
				OHM Wallet Help
			</div>
      <div>

      </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import parseAcct from '@/misc/acct/parse';
import Progress from '@client/scripts/loading';
import { query as urlQuery } from '../../../prelude/url';
import { acct as getAcct } from '../../filters/user';
import * as os from '@client/os';

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

    };
  },

  created() {
    this.fetch();
  },

  methods: {
    getAcct,

    fetch() {

    },

  }

});
</script>

<style lang="scss" scoped>

.monospace {
  font-family: Lucida Console, Courier, monospace;
}

</style>
