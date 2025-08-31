import { GezcezResponse } from "@gezcez/core";
import { Controller, Get, Req } from "@nestjs/common";

@Controller({
   path:"template",version:["1"]
})
export class TemplateController {
   @Get("/get")
   async getTemplate(@Req() req : Request) {
      return GezcezResponse({__message:"Hi from template!"})
   }
}