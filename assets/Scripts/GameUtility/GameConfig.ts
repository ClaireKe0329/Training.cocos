import { JsonAsset } from 'cc';

export interface IGameConfig
{
    readonly SpinSpeed: number;
    readonly ShockDistance: number;
    readonly ShockDuration: number;
    readonly ReelStopInterval: number;
    readonly SpinDuration: number;
}

export class GameConfig
{
    private static _instance: GameConfig | null = null;
    private _config: IGameConfig | null = null;

    private constructor()
    {
    }

    public static GetInstance(): GameConfig
    {
        if ( GameConfig._instance === null )
        {
            GameConfig._instance = new GameConfig();
        }

        return GameConfig._instance;
    }

    public SetConfig( configJson: JsonAsset ): void
    {
        if ( !configJson || !configJson.json )
        {
            throw new Error( '[GameConfig] SetConfig failed: config.json is missing.' );
        }

        const config = configJson.json as unknown as IGameConfig;

        if ( typeof config.SpinSpeed !== 'number' || !Number.isFinite( config.SpinSpeed ) || config.SpinSpeed < 1 )
        {
            throw new Error( '[GameConfig] SpinSpeed must be a number greater than or equal to 1.' );
        }

        if ( typeof config.ShockDistance !== 'number' || !Number.isFinite( config.ShockDistance ) || config.ShockDistance < 0 )
        {
            throw new Error( '[GameConfig] ShockDistance must be a number greater than or equal to 0.' );
        }

        if ( typeof config.ShockDuration !== 'number' || !Number.isFinite( config.ShockDuration ) || config.ShockDuration < 0.01 )
        {
            throw new Error( '[GameConfig] ShockDuration must be a number greater than or equal to 0.01.' );
        }

        if ( typeof config.ReelStopInterval !== 'number' || !Number.isFinite( config.ReelStopInterval ) || config.ReelStopInterval < 0 )
        {
            throw new Error( '[GameConfig] ReelStopInterval must be a number greater than or equal to 0.' );
        }

        if ( typeof config.SpinDuration !== 'number' || !Number.isFinite( config.SpinDuration ) || config.SpinDuration < 0.1 )
        {
            throw new Error( '[GameConfig] SpinDuration must be a number greater than or equal to 0.1.' );
        }

        this._config = config;
    }

    public get SpinSpeed(): number
    {
        return this.getConfig().SpinSpeed;
    }

    public get ShockDistance(): number
    {
        return this.getConfig().ShockDistance;
    }

    public get ShockDuration(): number
    {
        return this.getConfig().ShockDuration;
    }

    public get ReelStopInterval(): number
    {
        return this.getConfig().ReelStopInterval;
    }

    public get SpinDuration(): number
    {
        return this.getConfig().SpinDuration;
    }

    private getConfig(): IGameConfig
    {
        if ( this._config === null )
        {
            throw new Error( '[GameConfig] config.json has not been set.' );
        }

        return this._config;
    }
}
