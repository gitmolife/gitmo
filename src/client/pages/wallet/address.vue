<template>
    <div style="text-align: center;">
			<div style="font-size: 1.13em;">
				OHM Wallet Address
			</div>
      <div class="monospace">{{ address }}</div>
			<div><img v-bind:src="qrcode" style="image-rendering: pixelated; height: 370px; width: 370px;"/></div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import parseAcct from '@/misc/acct/parse';
import Progress from '@client/scripts/loading';
import { query as urlQuery } from '../../../prelude/url';
import { acct as getAcct } from '../../filters/user';
import * as os from '@client/os';
import QRCode from 'qrcode';

export default defineComponent({
  components: {

  },

  props: {
    acct: {
      type: String,
      required: false
    },
  },

  data() {
    return {
			address: "",
			qrcode: "0x",
    };
  },

  created() {
    this.fetch();
  },

  methods: {
    getAcct,

    fetch() {
      if (this.acct == null) {
				Progress.start();
				os.api('wallet/address').then(wallet => {
					this.address = wallet;
					this.createQR(wallet);
				}).catch(e => {
					this.error = e;
				}).finally(() => {
					Progress.done();
				});
			} else {
	      Progress.start();
	      os.api('wallet/address', parseAcct(this.acct)).then(wallet => {
					this.address = wallet;
					this.createQR(wallet);
	      }).catch(e => {
	        this.error = e;
	      }).finally(() => {
	        Progress.done();
	      });
			}
    },

		createQR(address: any) {
			QRCode.toDataURL(address)
			  .then(url => {
					this.qrcode = url;
			  })
			  .catch(err => {
			    console.error(err);
			  });
		},

  }

});
</script>

<style lang="scss" scoped>

.monospace {
  font-family: Lucida Console, Courier, monospace;
}

</style>
